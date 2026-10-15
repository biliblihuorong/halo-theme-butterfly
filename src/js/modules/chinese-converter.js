// OpenCC 1.4.2 官方 s2tw 配置；只打包简体到台湾正体需要的词库。
import {ConverterBuilder} from 'opencc-js/core';
import compatibility from 'opencc-js/dict/CJK_Compatibility_Ideographs';
import phrases from 'opencc-js/dict/STPhrases';
import regionalPhrases from 'opencc-js/dict/STPhrases_GeneratedFromRegionalPhrases';
import characters from 'opencc-js/dict/STCharacters';
import variantsPhrases from 'opencc-js/dict/TWVariantsPhrases';
import variants from 'opencc-js/dict/TWVariants';

export default ConverterBuilder({
  from: {cn: []},
  to: {tw: []},
  configs: {
    s2tw: {
      normalizationChain: [[compatibility]],
      segmentation: [phrases, regionalPhrases],
      conversionChain: [[phrases, regionalPhrases, characters], [variantsPhrases, variants]],
    },
  },
})({from: 'cn', to: 'tw'});
