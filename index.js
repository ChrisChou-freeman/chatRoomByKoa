import {default as Koa} from 'koa';
import {default as Router} from '@koa/router';
import {createServer} from 'http';
import {Server as socketIO} from 'socket.io';
import {default as render} from './lib/render.js';
import {default as staticFile} from 'koa-static';
import {dirname, join as pathJoin} from 'path';
import {default as logger} from 'koa-logger';
import {default as bodyParser} from 'koa-bodyparser';

const app = new Koa();
const router = Router();
const users = [];
const clients = [];
const server = createServer(app.callback());
const io = new socketIO(server);
const staticMid = staticFile(pathJoin(dirname(import.meta.url.split('file://')[1]), '/public'));

io.sockets.on('connection',socket=>{
  socket.on('online',sdata=>{
    const data = JSON.parse(sdata);
    //check already login
    if(!clients[data.user]){
      // new user online
      users.unshift(data.user);
      for(let index in clients){
        clients[index].emit('system',JSON.stringify({type:'online',msg:data.user,time:(new Date()).getTime()}));
        clients[index].emit('userflush',JSON.stringify({users:users}));
      }
      socket.emit('system',JSON.stringify({type:'in',msg:'',time:(new Date()).getTime()}));
      socket.emit('userflush',JSON.stringify({users:users}));
    }
      clients[data.user] = socket;
      socket.emit('userflush',JSON.stringify({users:users}));
  });

  socket.on('say',function(sdata){
    //dataformat:{to:'all',from:'Nick',msg:'msg'}
    const data = JSON.parse(sdata);
    const msgData = {
      time : (new Date()).getTime(),
      data : data
    }
    if(data.to == "all"){
      // talk to all
      for(let index in clients){
        clients[index].emit('say',msgData);
      }
    }else{
      // talk to someone
      clients[data.to].emit('say',msgData);
      clients[data.from].emit('say',msgData);
    }
  });
  socket.on('offline',()=>{
    socket.disconnect();
  });
  socket.on('disconnect',()=>{
    function userOffline(){
      for(let index in clients){
        if(clients[index] == socket){
          users.splice(users.indexOf(index),1);
          delete clients[index];
          for(let index_inline in clients){
            clients[index_inline].emit('system',JSON.stringify({type:'offline',msg:index,time:(new Date()).getTime()}));
            clients[index_inline].emit('userflush',JSON.stringify({users:users}));
          }
          break;
        }
      }
    }
    setTimeout(userOffline,5000);
  });
});

router.get('/', async ctx=>{
  if(!ctx.cookies){
    await ctx.redirect('/signin');
    return;
  }
  const cookies = ctx.cookies;
  if(!cookies.get('user')){
    await ctx.redirect('/signin');
    return;
  }
  await ctx.render('index');
});

router.get('/signin', async ctx=>{
  await ctx.render('signin');
});

router.post('/signin', async ctx=>{
  await ctx.cookies.set('user', ctx.request.body.username, {httpOnly: false});
  await ctx.redirect('/')
});

app.use(bodyParser());
app.use(logger())
app.use(render);
app.use(staticMid);
app.use(router.routes());

server.listen(3000);
