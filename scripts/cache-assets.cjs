function versionFontUrls(css, version) {
  return css.replace(/url\(\s*(['"]?)([^'"\s()]+\.(?:woff2?|ttf|otf))(?:\?([^'"\s()]*))?\1\s*\)/gi, (original, quote, font, search = '') => {
    if (/^(?:[a-z]+:|\/\/)/i.test(font)) return original;
    const query = new URLSearchParams(search);
    query.set('v', version);
    return `url(${quote}${font}?${query}${quote})`;
  });
}

module.exports = {versionFontUrls};
