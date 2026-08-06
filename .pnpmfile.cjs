module.exports = {
  hooks: {
    readPackage(pkg) {
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      function enforce(map, name, newVer) {
        if (map[name]) {
          map[name] = newVer;
        }
      }

      for (const map of [deps, devDeps]) {
        enforce(map, 'js-yaml', '4.3.0');
        enforce(map, 'tar', '7.5.21');
        enforce(map, 'hono', '4.12.34');
        enforce(map, 'fast-uri', '3.1.5');
        enforce(map, 'sharp', '0.35.0');
        enforce(map, 'valibot', '1.4.2');
        enforce(map, 'postcss', '8.5.23');

        if (map['brace-expansion']) {
          if (map['brace-expansion'].startsWith('1.') || map['brace-expansion'].startsWith('^1.')) {
            map['brace-expansion'] = '1.1.18';
          } else {
            map['brace-expansion'] = '5.0.9';
          }
        }

        if (map['undici']) {
          if (map['undici'].startsWith('6.') || map['undici'].startsWith('^6.')) {
            map['undici'] = '6.28.0';
          } else {
            map['undici'] = '7.29.0';
          }
        }

        if (map['@hono/node-server']) {
          if (map['@hono/node-server'].startsWith('1.') || map['@hono/node-server'].startsWith('^1.')) {
            map['@hono/node-server'] = '1.19.13';
          } else {
            map['@hono/node-server'] = '2.0.10';
          }
        }
      }

      return pkg;
    }
  }
};
