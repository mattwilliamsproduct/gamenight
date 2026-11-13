(function (root) {
  'use strict';

  var MAX_EDGE = 512;
  var MAX_DATA_CHARS = 180000;

  function isPlaceholderAvatar(value) {
    var raw = String(value || '').trim();
    return /^neutral-\d+\.svg$/i.test(raw) || /^silhouette-[a-z0-9-]+\.png$/i.test(raw);
  }

  function isDataPhoto(value) {
    var raw = String(value || '').trim();
    return /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(raw) && raw.length >= 64;
  }

  function isSafeAvatarFile(value) {
    var raw = String(value || '').trim();
    if (!raw || raw.indexOf('..') !== -1 || raw.indexOf('/') !== -1 || raw.indexOf('\\') !== -1) return false;
    if (/^data:/i.test(raw) || /^blob:/i.test(raw)) return false;
    return /^[a-z0-9][a-z0-9._-]{0,80}\.(?:png|jpe?g|webp|gif|svg)$/i.test(raw);
  }

  function isBrokenAvatarRef(value) {
    var raw = String(value || '').trim();
    if (!raw || isPlaceholderAvatar(raw)) return false;
    if (isDataPhoto(raw) || isSafeAvatarFile(raw)) return false;
    return true;
  }

  function isUploadedPlayerPhoto(file) {
    var raw = String(file || '').trim();
    if (!raw || isPlaceholderAvatar(raw) || isBrokenAvatarRef(raw)) return false;
    return isDataPhoto(raw) || isSafeAvatarFile(raw);
  }

  function avatarSrc(stored, fallback) {
    var raw = String(stored || '').trim();
    if (isDataPhoto(raw)) return raw;
    if (isSafeAvatarFile(raw) && !isPlaceholderAvatar(raw)) return './avatars/' + raw;
    return fallback;
  }

  function loadViaImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('decode'));
      };
      img.src = url;
    });
  }

  function encodeCanvas(canvas) {
    var qualities = [0.82, 0.7, 0.55, 0.4];
    var i;
    for (i = 0; i < qualities.length; i += 1) {
      var data = '';
      try { data = canvas.toDataURL('image/jpeg', qualities[i]); } catch (error) { data = ''; }
      if (isDataPhoto(data) && data.length <= MAX_DATA_CHARS) return data;
    }
    return '';
  }

  function prepareAvatarPhoto(file) {
    var name = String((file && file.name) || '');
    var type = String((file && file.type) || '').toLowerCase();
    var heic = /image\/hei[cf]/.test(type) || /\.hei[cf]$/i.test(name);
    var unread = heic
      ? 'That photo could not be read. Try a JPEG or PNG.'
      : 'That photo could not be read. Try a different picture.';
    if (!file) return Promise.resolve({ok: false, reason: 'empty', message: unread});
    var decoded;
    try {
      decoded = (typeof createImageBitmap === 'function')
        ? createImageBitmap(file).catch(function () { return null; })
        : Promise.resolve(null);
    } catch (error) {
      decoded = Promise.resolve(null);
    }
    return decoded.then(function (bitmap) {
      if (bitmap) return bitmap;
      return loadViaImage(file);
    }).catch(function () {
      return null;
    }).then(function (bitmap) {
      if (!bitmap) return {ok: false, reason: 'decode', message: unread};
      try {
        var sourceW = bitmap.width || bitmap.naturalWidth || 1;
        var sourceH = bitmap.height || bitmap.naturalHeight || 1;
        var edge = Math.max(sourceW, sourceH, 1);
        var scale = Math.min(1, MAX_EDGE / edge);
        var width = Math.max(1, Math.round(sourceW * scale));
        var height = Math.max(1, Math.round(sourceH * scale));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        if (!ctx) return {ok: false, reason: 'encode', message: 'That photo could not be saved. The current picture stayed.'};
        ctx.fillStyle = '#fffdf8';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        if (typeof bitmap.close === 'function') bitmap.close();
        var data = encodeCanvas(canvas);
        if (!data) return {ok: false, reason: 'encode', message: 'That photo could not be saved. The current picture stayed.'};
        return {ok: true, data: data};
      } catch (error) {
        return {ok: false, reason: 'encode', message: 'That photo could not be saved. The current picture stayed.'};
      }
    });
  }

  var api = {
    MAX_EDGE: MAX_EDGE,
    isPlaceholderAvatar: isPlaceholderAvatar,
    isDataPhoto: isDataPhoto,
    isSafeAvatarFile: isSafeAvatarFile,
    isBrokenAvatarRef: isBrokenAvatarRef,
    isUploadedPlayerPhoto: isUploadedPlayerPhoto,
    avatarSrc: avatarSrc,
    prepareAvatarPhoto: prepareAvatarPhoto
  };

  root.BPGAvatarPhoto = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
