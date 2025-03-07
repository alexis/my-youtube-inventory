//
// A work around for the punnycode warning, which seems to be triggered in dependencies of googleapis (gaxios, etc):
// | The `punycode` module is deprecated. Please use a userland alternative instead.
//
import moduleAlias from 'module-alias';
moduleAlias.addAlias('punycode', 'punycode/');
