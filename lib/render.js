import {default as views} from 'koa-views';
import {join as pathJoin, dirname} from 'path';

export default views(pathJoin(dirname(import.meta.url.split('file://')[1]), '/../views'), {extension: 'pug'});
