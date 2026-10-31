import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../setup-status.js',import.meta.url),'utf8');
function harness(verify){
 const nodes=new Map();
 const listeners=new Map();
 const events=[];
 const make=id=>({
  id,hidden:true,textContent:'',innerHTML:'',className:'',
  classList:{add(){},remove(){}},
  addEventListener(type,fn){this.onClick=fn},
  appendChild(child){nodes.set(child.id,child)},
  closest(){return null}
 });
 const body=make('body');
 const document={body,getElementById(id){if(!nodes.has(id)&&id!=='setup-overlay')nodes.set(id,make(id));return nodes.get(id)||null;},createElement(){return make('');}};
 const window={PsychDeskFirebase:{getConnectionStatus:()=>state},PsychDeskCloud:{isConnected:()=>connected,verifyDriveConnection:verify},addEventListener(name,fn){listeners.set(name,fn)},dispatchEvent(e){events.push(e);listeners.get(e.type)?.(e)}};
 let state={signedIn:false,loading:false},connected=false;
 vm.runInNewContext(script,{window,document,setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,Event,Date,Promise});
 return {window,nodes,setState:value=>state=value,setDrive:value=>connected=value,emit(name,props={}){window.dispatchEvent(Object.assign({type:name},props))}};
}
test('setup popup waits for actual Firestore sync and checked Drive access',async()=>{
 let checked=0;
 const ui=harness(async()=>{checked++;return{email:'student@example.test'}});
 ui.window.PsychDeskSetup.start();
 assert.match(ui.nodes.get('setup-steps').innerHTML,/Waiting for Google sign-in/);
 ui.setState({signedIn:true,uid:'student',email:'student@example.test',synced:false,loading:true});
 ui.setDrive(true);
 ui.window.PsychDeskSetup.refresh();
 assert.notEqual(ui.nodes.get('setup-title').textContent,'All set — ready to study');
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.notEqual(ui.nodes.get('setup-title').textContent,'All set — ready to study');
 ui.setState({signedIn:true,uid:'student',email:'student@example.test',synced:true,loading:false});
 ui.window.PsychDeskSetup.refresh();
 assert.equal(ui.nodes.get('setup-title').textContent,'All set — ready to study');
 assert.equal(checked,1);
 ui.window.PsychDeskSetup.close();
});
test('failed Drive verification shows a reconnect path rather than success',async()=>{
 const ui=harness(async()=>{throw Error('Drive permission denied')});
 ui.window.PsychDeskSetup.start();
 ui.setState({signedIn:true,uid:'student',synced:true});
 ui.setDrive(true);
 ui.window.PsychDeskSetup.refresh();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(ui.nodes.get('setup-title').textContent,'Action needed');
 assert.match(ui.nodes.get('setup-actions').innerHTML,/Reconnect Google Drive/);
 assert.match(ui.nodes.get('setup-details').textContent,/Drive permission denied/);
 ui.window.PsychDeskSetup.close();
});
