# Emoji names must not crash the roster

What broke: `getAvatarFallback` used `name.charAt(0)`. A leading emoji is a surrogate pair. The lone half then went into `encodeURIComponent`, which throws `URIError: URI malformed`. Adding 🔥June from an empty home blew up `renderRoster`.

What fixed it: take the first code point with `[...name][0]`, XML-escape it, and keep a `?` fallback if encoding still fails.

What not to repeat: do not slice a display name with `charAt(0)` before putting it in a data URI.
