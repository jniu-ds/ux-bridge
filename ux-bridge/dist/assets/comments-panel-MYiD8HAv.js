(function(){let e=`/api/comments`,t=`/api/assets`,n=3e3,r={"/project-overview.html":`Project Overview`,"/building-preview.html":`Building overview`,"/l1-bonus-preview.html":`L1 Bonus preview`,"/l1-l2-bonus-preview.html":`L1/L2 Bonus preview`},i={"/project-overview.html":`overview`,"/building-preview.html":`building`,"/l1-bonus-preview.html":`l1-bonus`,"/l1-l2-bonus-preview.html":`l1-l2-bonus`},a=new URLSearchParams(window.location.search).get(`table-thumb`)===`1`,o=document.querySelector(`[data-comments-root]`),s=document.createElement(`aside`),c=document.createElement(`div`),l=document.createElement(`input`),u=(()=>{let e=document.querySelector(`[data-mobile-sheet-backdrop]`);if(e)return e;let t=document.createElement(`button`);return t.type=`button`,t.className=`bridge-mobile-sheet-backdrop`,t.setAttribute(`data-mobile-sheet-backdrop`,``),t.setAttribute(`aria-label`,`Close drawer`),t.hidden=!0,document.body.append(t),t})(),d=document.body.dataset.dynamicProject===`true`;if(!o||a)return;document.body.classList.add(`bridge-body--has-comments`),document.body.classList.add(`bridge-body--has-uploads`),s.className=`uploads-panel`,s.setAttribute(`data-uploads-root`,``),s.hidden=!0,document.body.append(s),c.className=`asset-viewer`,c.setAttribute(`data-asset-viewer-root`,``),c.hidden=!0,document.body.append(c),l.type=`file`,l.multiple=!0,l.hidden=!0,l.className=`comments-panel__file-input`,l.setAttribute(`data-comments-file-input`,``),document.body.append(l);let f={projectKey:``,pageKey:``,pageLabel:``,drawerOpen:!1,comments:[],users:[],isLoading:!0,isSubmitting:!1,error:``,body:``,mention:null,mentionIndex:0,replyingCommentId:``,replyBody:``,collapsedThreadIds:new Set,showUnreadOnly:!1,activeThreadId:``,refreshTimer:null,unseenCount:0,editingCommentId:``,editingCommentBody:``,busyCommentId:``,copiedCommentId:``,shouldStickToBottom:!0,pageCommentSummary:new Map,refreshTick:0,currentPageActivityAt:``,pendingAssets:[],uploads:[],uploadsLoading:!1,uploadsSubmitting:!1,uploadsDeletingAssetId:``,uploadsError:``,uploadsDrawerOpen:!1,assetFilePickerContext:`comments`,assetViewerAsset:null,assetViewerItems:[],assetViewerIndex:0,assetViewerScaleMode:`fit`,assetViewerScaleMenuOpen:!1,lastSeenCommentId:``,lastSeenAt:0,lastPersistedSeenCommentId:``,lastPersistedSeenAt:0,canDeleteAnyComment:!1,commentsRequestToken:0,summaryRequestToken:0};function p(){if(window.uxBridgeUser?.email)return window.uxBridgeUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);return e?JSON.parse(e):null}catch{return null}}function m(e){return String(e||``).trim().toLowerCase()}function h(){return m(p()?.email)}function g(e=f.pageKey){let t=p();return`ux-bridge-comments-seen:${String(t?.email||`anonymous`).trim().toLowerCase()}:${f.projectKey}:${e}`}function _(e=f.pageKey){try{let t=localStorage.getItem(g(e));if(!t)return{lastSeenCommentId:``,lastSeenAt:0};let n=JSON.parse(t);return n&&typeof n==`object`?{lastSeenCommentId:String(n.lastSeenCommentId||``).trim(),lastSeenAt:Number(n.lastSeenAt)||0}:{lastSeenCommentId:String(t||``).trim(),lastSeenAt:0}}catch{return{lastSeenCommentId:``,lastSeenAt:0}}}function v(e,t=0,n=f.pageKey){try{if(!e&&!t){localStorage.removeItem(g(n));return}localStorage.setItem(g(n),JSON.stringify({lastSeenCommentId:String(e||``).trim(),lastSeenAt:Number(t)||0}))}catch{}}function y(e){let t=Date.parse(String(e?.createdAt||``));if(Number.isFinite(t))return t;let n=Date.parse(String(e?.editedAt||``));return Number.isFinite(n)?n:0}function b(e,t=f.lastSeenAt,n=!1){let r=Array.isArray(e)?e:[];return!r.length||n?0:r.reduce((e,n)=>e+ +(y(n)>Number(t||0)),0)}function x(){f.unseenCount=b(f.comments,f.lastSeenAt,f.drawerOpen)}function S(e){let t=(Array.isArray(e)?e:[]).reduce((e,t)=>{let n=new Date(t.editedAt||t.createdAt||0).getTime();return Number.isNaN(n)?e:Math.max(e,n)},0);return t?new Date(t).toISOString():``}function ee(e=[]){let t=Array.isArray(e)?e.map(e=>String(e||``).trim()).filter(Boolean):[],n=String(f.lastSeenCommentId||``).trim();if(!t.length)return 0;if(!n)return t.length;let r=t.findIndex(e=>e===n);return r<0?t.length:Math.max(t.length-(r+1),0)}function te(){let e=f.pageCommentSummary.get(f.pageKey);f.currentPageActivityAt=String(e?.latestActivityAt||``)}async function C(){let t=f.comments.at(-1)||null,n=String(t?.id||``),r=y(t);if(f.lastSeenCommentId=n,f.lastSeenAt=r,f.unseenCount=0,v(n,r),!(n===f.lastPersistedSeenCommentId&&r===Number(f.lastPersistedSeenAt||0))&&!(!f.projectKey||!f.pageKey))try{await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`markSeen`,project:f.projectKey,page:f.pageKey,commentId:n})}),f.lastPersistedSeenCommentId=n,f.lastPersistedSeenAt=r}catch{}}function ne(){if(f.drawerOpen||f.unseenCount>0||f.uploadsDrawerOpen)return n;let e=Date.parse(String(f.currentPageActivityAt||``));return Number.isFinite(e)&&Date.now()-e<6e4?n:1e4}function re(){return Array.from(document.querySelectorAll(`[data-project-page-key]`)).map(e=>String(e.dataset.projectPageKey||``).trim()).filter(Boolean)}function ie(e){let t=e.querySelector(`[data-nav-comments-badge]`);return t||(t=document.createElement(`span`),t.className=`bridge-sidebar__comments-badge project-page-strip__comments-badge`,t.setAttribute(`data-nav-comments-badge`,``),t.hidden=!0,e.append(t),t)}function w(){document.querySelectorAll(`[data-project-page-key]`).forEach(e=>{let t=String(e.dataset.projectPageKey||``).trim();if(!t)return;let n=ie(e),r=f.pageCommentSummary.get(t),i=t===f.pageKey?b(f.comments,f.lastSeenAt,f.drawerOpen):Number(r?.unreadCount||0);if(!i){n.hidden=!0,n.textContent=``;return}n.hidden=!1,n.textContent=String(i>99?`99+`:i)})}function ae(){let e=window.location.pathname;return{projectKey:document.body.dataset.projectKey||`brand-affiliate-mobile`,pageKey:document.body.dataset.pageKey||i[e],pageLabel:document.body.dataset.pageLabel||r[e]||document.querySelector(`.bridge-project-toolbar h1`)?.textContent?.trim()||`Page`}}function T(e){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function E(e){return T(e).replaceAll("`",`&#96;`)}function oe(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``):`UX`}function se(e){let t=new Date(e);return Number.isNaN(t.getTime())?``:new Intl.DateTimeFormat(`en-US`,{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).format(t)}function ce(e){let t=Number(e)||0;return t>=1024*1024?`${(t/(1024*1024)).toFixed(1)} MB`:t>=1024?`${Math.max(t/1024,.1).toFixed(1)} KB`:`${t} B`}function D(e){return String(e?.kind||``).trim().toLowerCase()}function le(e){return D(e)===`image`}function ue(e){return D(e)===`video`}function de(e){return D(e)===`pdf`}function fe(e){let n=String(e?.id||``).trim();return n?`${t}?assetId=${encodeURIComponent(n)}`:String(e?.previewUrl||``).trim()}function pe(e){let t=String(e?.fileName||``).trim(),n=t.includes(`.`)?t.split(`.`).pop():``;return String(n||D(e)||`file`).toUpperCase().slice(0,6)}function me(e=``){if(e===f.pageKey)return f.pageLabel;let t=String(e||``).trim().toLowerCase();if(!t)return`Page`;let n=Object.keys(i).find(e=>i[e]===t);return n?r[n]||`Page`:t.replaceAll(`-`,` `)}function he(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result||``)),r.onerror=()=>n(Error(`Could not read ${e?.name||`file`}.`)),r.readAsDataURL(e)})}function ge(e,t){return{id:`pending-${crypto.randomUUID()}`,fileName:String(e?.name||`Upload`).trim()||`Upload`,contentType:String(e?.type||`application/octet-stream`).trim()||`application/octet-stream`,sizeBytes:Number(e?.size)||0,kind:String(e?.type||``).startsWith(`image/`)?`image`:String(e?.type||``).startsWith(`video/`)?`video`:String(e?.type||``).trim().toLowerCase()===`application/pdf`?`pdf`:`file`,previewUrl:String(t||``).trim(),dataBase64:String(t||``).includes(`,`)?String(t).split(`,`)[1]:``,createdAt:Date.now(),pageId:f.pageKey}}async function _e(e){let t=Array.from(e||[]).filter(Boolean);return t.length?Promise.all(t.map(async e=>ge(e,await he(e)))):[]}function ve(e){let t=se(e.createdAt);return e.editedAt?`${t} · edited`:t}function ye(e){return String(e?.threadRootId||e?.parentCommentId||e?.id||``).trim()}function O(e,t=f.comments){let n=ye(e);return(Array.isArray(t)?t:[]).find(e=>String(e?.id||``).trim()===n)||e}function k(e,t=f.comments){let n=String(e?.id||``).trim();return n?(Array.isArray(t)?t:[]).filter(e=>String(e?.id||``).trim()!==n&&ye(e)===n):[]}function A(e,t=f.comments){return[e,...k(e,t)].filter(Boolean).reduce((e,t)=>e?y(t)>=y(e)?t:e:t,null)}function j(e,t=f.comments){return y(A(e,t)||e)>Number(f.lastSeenAt||0)}function be(e){return!!String(e?.resolvedAt||``).trim()}function xe(e,t=f.comments){return y(A(e,t)||e)}function Se(e=f.comments){return(Array.isArray(e)?e:[]).filter(e=>!String(e?.parentCommentId||``).trim()).map(t=>{let n=k(t,e);return{rootComment:t,replies:n,latestComment:A(t,e)||t,latestActivityTimestamp:xe(t,e),replyCount:n.length,isResolved:be(t),isUnread:j(t,e),isCollapsed:M(t.id)}}).sort((e,t)=>t.latestActivityTimestamp===e.latestActivityTimestamp?String(t.rootComment?.id||``).localeCompare(String(e.rootComment?.id||``)):t.latestActivityTimestamp-e.latestActivityTimestamp)}function M(e=``){return f.collapsedThreadIds instanceof Set&&f.collapsedThreadIds.has(String(e||``).trim())}function Ce(e=``,t=!1){let n=String(e||``).trim();n&&(f.collapsedThreadIds instanceof Set||(f.collapsedThreadIds=new Set),t?f.collapsedThreadIds.add(n):f.collapsedThreadIds.delete(n))}function we(e,t=f.comments){return O(e,t)?.selectionTarget||e?.selectionTarget||null}function N(){let e=f.comments.filter(e=>Array.isArray(e?.mentions)&&e.mentions.some(e=>m(e?.email)===h())).map(e=>e.id);f.pageCommentSummary.set(f.pageKey,{commentIds:f.comments.map(e=>e.id),latestActivityAt:S(f.comments),unreadCount:f.drawerOpen?0:b(f.comments,f.lastSeenAt,!1),unreadMentionCount:f.drawerOpen?0:ee(e),mentionCommentIds:e,lastSeenCommentId:f.lastSeenCommentId,lastSeenAt:f.lastSeenAt}),te()}function Te(e){return e.map(e=>[e.id,e.createdAt,e.editedAt||``,e.body||``,e.author?.email||``].join(`::`)).join(`|`)}function Ee(e){return e.map(e=>[e.email||``,e.fullName||``,e.role||``].join(`::`)).join(`|`)}function De(e){let t=e.map(e=>e?.fullName).filter(Boolean).sort((e,t)=>t.length-e.length).map(e=>e.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`));return t.length?RegExp(`@(${t.join(`|`)})`,`gi`):null}function Oe(e,t=[]){let n=T(e).replace(/\n/g,`<br />`),r=De(t);return r?n.replace(r,e=>`<span class="comments-panel__mention">${e}</span>`):n}function ke(e,t){let n=e.slice(0,t),r=n.lastIndexOf(`@`);if(r<0)return null;let i=n[r-1];if(i&&!/\s/.test(i))return null;let a=n.slice(r+1);if(a.includes(`
`)||a.includes(`@`)||/\s{2,}/.test(a))return null;let o=a.trimStart().toLowerCase(),s=f.users.filter(e=>o?[e.fullName,e.email].join(` `).toLowerCase().includes(o):!0).slice(0,6);return s.length?{start:r,end:t,suggestions:s}:null}function P(){document.body.classList.toggle(`comments-open`,f.drawerOpen),o.inert=!f.drawerOpen;let e=document.querySelector(`[data-comments-drawer-toggle]`);e&&(e.setAttribute(`aria-expanded`,f.drawerOpen?`true`:`false`),e.setAttribute(`aria-hidden`,f.drawerOpen?`true`:`false`),e.classList.toggle(`is-active`,f.drawerOpen)),R()}function F(e,t=`comments`){f.drawerOpen!==e&&(f.drawerOpen=e,f.drawerOpen?(f.shouldStickToBottom=!0,C()):x(),$(),P(),f.drawerOpen&&window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}})))}async function Ae(e){try{let t=await _e(e);if(!t.length)return;f.pendingAssets=[...f.pendingAssets,...t],f.error=``,Q()}catch(e){f.error=e instanceof Error?e.message:`Could not add file.`,Q()}finally{l.value=``}}function je(e){f.pendingAssets=f.pendingAssets.filter(t=>t.id!==e),Q()}async function Me(){return Ne(f.pendingAssets)}async function Ne(e){let n=[];try{for(let r of Array.isArray(e)?e:[]){let e=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`uploadAsset`,project:f.projectKey,page:f.pageKey,fileName:r.fileName,contentType:r.contentType,dataBase64:r.dataBase64})}),i=await e.json();if(!e.ok||!i?.ok||!i.asset)throw Error(i?.error||`Could not upload ${r.fileName}.`);n.push(i.asset)}}catch(e){throw await Ie(n),e}return n}function Pe(e=`comments`){f.assetFilePickerContext=e,l.click()}async function Fe(e){try{let t=await _e(e);if(!t.length)return;f.uploadsSubmitting=!0,f.uploadsError=``,X(),await Ne(t),await I({silent:!0})}catch(e){f.uploadsError=e instanceof Error?e.message:`Could not upload files.`}finally{f.uploadsSubmitting=!1,l.value=``,X()}}async function Ie(e){await Promise.all((Array.isArray(e)?e:[]).map(async e=>{if(e?.id)try{await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`deleteAsset`,assetId:e.id})})}catch{}}))}async function I(e={}){let{silent:n=!1}=e;n||(f.uploadsLoading=!0,f.uploadsError=``,X());try{let e=await fetch(`${t}?project=${encodeURIComponent(f.projectKey)}`,{credentials:`include`,cache:`no-store`}),r=await e.json();if(!e.ok||!r?.ok)throw Error(r?.error||`Could not load uploads.`);f.uploads=Array.isArray(r.assets)?r.assets:[],(f.uploadsDrawerOpen||!n)&&X()}catch(e){f.uploadsError=e instanceof Error?e.message:`Could not load uploads.`,X()}finally{f.uploadsLoading=!1,n||X()}}function L(){document.body.classList.toggle(`uploads-open`,f.uploadsDrawerOpen),s.hidden=!f.uploadsDrawerOpen,s.inert=!f.uploadsDrawerOpen;let e=document.querySelector(`[data-uploads-drawer-toggle]`);e&&(e.setAttribute(`aria-expanded`,f.uploadsDrawerOpen?`true`:`false`),e.setAttribute(`aria-hidden`,f.uploadsDrawerOpen?`true`:`false`),e.classList.toggle(`is-active`,f.uploadsDrawerOpen)),R()}function R(){u&&(u.hidden=!0,u.classList.remove(`is-visible`))}function z(e,t=`uploads`){if(f.uploadsDrawerOpen!==e){if(f.uploadsDrawerOpen=e,L(),f.uploadsDrawerOpen){X(),I({silent:!0}),window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}}));return}X()}}function Le(e){let t=String(e||``).trim();if(!t)return null;for(let e of f.comments){let n=(Array.isArray(e.assets)?e.assets:[]).find(e=>e.id===t);if(n)return n}return f.pendingAssets.find(e=>e.id===t)||f.uploads.find(e=>e.id===t)||null}function Re(){return f.uploads.length?f.uploads:f.comments.flatMap(e=>Array.isArray(e.assets)?e.assets:[])}function ze(e){return e===`fit`?`Fit`:`${Math.round((Number(e)||1)*100)}%`}function Be(e){return e===`fit`?1:Number(e)||1}function Ve(){let e=c.querySelector(`[data-asset-viewer-scale]`),t=c.querySelector(`[data-asset-viewer-scale-trigger]`),n=c.querySelector(`[data-asset-viewer-scale-menu]`);!e||!t||!n||(e.dataset.value=f.assetViewerScaleMode,e.dataset.open=f.assetViewerScaleMenuOpen?`true`:`false`,t.setAttribute(`aria-expanded`,f.assetViewerScaleMenuOpen?`true`:`false`),n.hidden=!f.assetViewerScaleMenuOpen)}function He(e){f.assetViewerScaleMode=String(e||`fit`),f.assetViewerScaleMenuOpen=!1,Z()}function B(e){let t=f.assetViewerItems.length;t&&(f.assetViewerIndex=(e+t)%t,f.assetViewerAsset=f.assetViewerItems[f.assetViewerIndex]||null,Z())}function Ue(e){let t=typeof e==`string`?Le(e):e;if(!t)return;let n=(String(t.id||``).startsWith(`pending-`)?f.pendingAssets:Re()).filter(Boolean),r=Math.max(n.findIndex(e=>String(e?.id||``).trim()===String(t.id||``).trim()),0);f.assetViewerItems=n,f.assetViewerIndex=r,f.assetViewerAsset=t,f.assetViewerScaleMode=`fit`,f.assetViewerScaleMenuOpen=!1,Z()}function V(){f.assetViewerAsset=null,f.assetViewerItems=[],f.assetViewerIndex=0,f.assetViewerScaleMenuOpen=!1,Z()}function We(e){let t=String(e||``).trim();if(t){if(f.uploads=f.uploads.filter(e=>String(e?.id||``).trim()!==t),f.comments=f.comments.map(e=>({...e,assets:(Array.isArray(e.assets)?e.assets:[]).filter(e=>String(e?.id||``).trim()!==t)})),String(f.assetViewerAsset?.id||``).trim()===t){V();return}f.assetViewerItems.length&&(f.assetViewerItems=f.assetViewerItems.filter(e=>String(e?.id||``).trim()!==t),f.assetViewerIndex>=f.assetViewerItems.length&&(f.assetViewerIndex=Math.max(0,f.assetViewerItems.length-1)),f.assetViewerAsset=f.assetViewerItems[f.assetViewerIndex]||null,Z())}}async function Ge(e){let n=String(e||``).trim();if(!(!n||f.uploadsDeletingAssetId===n)){f.uploadsDeletingAssetId=n,f.uploadsError=``,X();try{let e=await fetch(t,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`deleteAsset`,assetId:n})}),r=await e.json();if(!e.ok||r?.ok===!1)throw Error(r?.error||`Could not delete asset.`);We(n),await Promise.all([I({silent:!0}),H({silent:!0})])}catch(e){f.uploadsError=e instanceof Error?e.message:`Could not delete asset.`}finally{f.uploadsDeletingAssetId=``,Q()}}}async function H(t={}){let{silent:n=!1}=t,r=++f.commentsRequestToken,i=f.comments.map(e=>e.id).join(`|`),a=Te(f.comments),o=Ee(f.users),s=f.unseenCount,c=f.error;n||(f.isLoading=!0,f.error=``,Q());try{let t=await fetch(`${e}?project=${encodeURIComponent(f.projectKey)}&page=${encodeURIComponent(f.pageKey)}`,{credentials:`include`,cache:`no-store`}),l=await t.json();if(r!==f.commentsRequestToken)return;if(!t.ok||!l?.ok)throw Error(l?.error||`Could not load comments.`);f.comments=Array.isArray(l.comments)?l.comments:[],f.users=Array.isArray(l.users)?l.users:[],f.canDeleteAnyComment=!!l.canDeleteAnyComment;let u=_(),d=Number(l.lastSeenAt)||0,p=String(l.lastSeenCommentId||``);if(f.lastPersistedSeenCommentId=p,f.lastPersistedSeenAt=d,f.lastSeenAt=Math.max(d,u.lastSeenAt||0),f.lastSeenCommentId=f.lastSeenAt===d&&p?p:u.lastSeenCommentId,mt(i,f.comments)&&(f.shouldStickToBottom=!0),f.currentPageActivityAt=S(f.comments),f.drawerOpen)await C();else{let e=f.pageCommentSummary.get(f.pageKey);e?f.unseenCount=Number(e.unreadCount||0):x()}$(),w();let m=Te(f.comments),h=Ee(f.users);n&&(m!==a||h!==o||f.unseenCount!==s||f.error!==c)&&Q()}catch(e){if(r!==f.commentsRequestToken)return;f.error=e instanceof Error?e.message:`Could not load comments.`,n&&f.error!==c&&Q()}finally{if(r!==f.commentsRequestToken)return;n||(f.isLoading=!1,Q())}}async function U(){let t=++f.summaryRequestToken,n=re();if(!(!f.projectKey||!n.length))try{let r=await fetch(`${e}?project=${encodeURIComponent(f.projectKey)}&summary=pages&pages=${encodeURIComponent(n.join(`,`))}`,{credentials:`include`,cache:`no-store`}),i=await r.json().catch(()=>({}));if(t!==f.summaryRequestToken)return!1;if(!r.ok||!i?.ok)throw Error(i?.error||`Could not load comment summary.`);let a=f.currentPageActivityAt,o=f.unseenCount;f.pageCommentSummary=new Map((Array.isArray(i.summary)?i.summary:[]).map(e=>[e.page,(()=>{let t=Array.isArray(e.commentIds)?e.commentIds:[],n=Array.isArray(e.mentionCommentIds)?e.mentionCommentIds:[],r=_(e.page),i=String(e.lastSeenCommentId||``),a=Number(e.lastSeenAt)||0,o=i||r.lastSeenCommentId,s=e=>{if(!Array.isArray(e)||!e.length)return 0;if(!o)return e.length;let t=e.findIndex(e=>e===o);return t<0?e.length:Math.max(e.length-(t+1),0)};return{commentIds:t,latestActivityAt:String(e.latestActivityAt||``),unreadCount:a>0?Number(e.unreadCount||0):s(t),unreadMentionCount:a>0?Number(e.unreadMentionCount||0):s(n),lastSeenCommentId:o,lastSeenAt:Math.max(a,r.lastSeenAt||0)}})()])),te();let s=f.pageCommentSummary.get(f.pageKey);return!f.drawerOpen&&s&&(f.unseenCount=Number(s.unreadCount||0)),f.unseenCount!==o&&$(),w(),a!==f.currentPageActivityAt}catch{return t===f.summaryRequestToken?($(),w(),!1):!1}}function Ke(){f.refreshTimer&&window.clearTimeout(f.refreshTimer);let e=()=>{f.refreshTimer=window.setTimeout(()=>{if(!f.projectKey||!f.pageKey||f.isSubmitting||document.visibilityState!==`visible`){e();return}if(f.drawerOpen){H({silent:!0}).finally(e),U();return}U().then(e=>e?H({silent:!0}):null).finally(e)},ne())};e()}function qe(){f.refreshTimer&&=(window.clearTimeout(f.refreshTimer),null)}function W(){if(!(!f.projectKey||!f.pageKey||document.visibilityState!==`visible`)){if(f.uploadsDrawerOpen&&I({silent:!0}),f.drawerOpen){U().then(e=>{e&&H({silent:!0})});return}U().then(e=>{e&&H({silent:!0})})}}async function Je(){if(!(!f.body.trim()&&!f.pendingAssets.length||f.isSubmitting)){f.isSubmitting=!0,f.error=``,Q();try{let t=f.pendingAssets.length?await Me():[],n=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({project:f.projectKey,page:f.pageKey,body:f.body,assets:t})}),r=await n.json();if(!n.ok||!r?.ok)throw await Ie(t),Error(r?.error||`Could not post comment.`);f.comments=Array.isArray(r.comments)?r.comments:f.comments,f.canDeleteAnyComment=!!r.canDeleteAnyComment,f.users=Array.isArray(r.users)?r.users:f.users,f.canDeleteAnyComment=!!r.canDeleteAnyComment,f.shouldStickToBottom=!0,f.body=``,f.pendingAssets=[],f.mention=null,f.mentionIndex=0,f.lastSeenCommentId=f.comments.at(-1)?.id||``,f.lastSeenAt=y(f.comments.at(-1)),N(),$(),w(),I({silent:!0})}catch(e){f.error=e instanceof Error?e.message:`Could not post comment.`}finally{f.isSubmitting=!1,Q()}}}function Ye(e){f.editingCommentId=e.id,f.editingCommentBody=e.body,f.copiedCommentId=``,Q()}function Xe(){f.editingCommentId=``,f.editingCommentBody=``,f.busyCommentId=``,Q()}async function Ze(t){let n=f.editingCommentBody.trim();if(!(!n||f.busyCommentId)){f.busyCommentId=t,Q();try{let r=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`edit`,project:f.projectKey,page:f.pageKey,commentId:t,body:n})}),i=await r.json();if(!r.ok||!i?.ok)throw Error(i?.error||`Could not save comment.`);f.comments=Array.isArray(i.comments)?i.comments:f.comments,f.canDeleteAnyComment=!!i.canDeleteAnyComment,f.users=Array.isArray(i.users)?i.users:f.users,f.shouldStickToBottom=!0,f.editingCommentId=``,f.editingCommentBody=``,f.busyCommentId=``,N(),w(),Q()}catch(e){f.error=e instanceof Error?e.message:`Could not save comment.`,f.busyCommentId=``,Q()}}}async function Qe(t){if(!f.busyCommentId&&window.confirm(`Delete this comment?`)){f.busyCommentId=t,Q();try{let n=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`delete`,project:f.projectKey,page:f.pageKey,commentId:t})}),r=await n.json();if(!n.ok||!r?.ok)throw Error(r?.error||`Could not delete comment.`);f.comments=Array.isArray(r.comments)?r.comments:f.comments,f.users=Array.isArray(r.users)?r.users:f.users,f.shouldStickToBottom=!0,f.editingCommentId=f.editingCommentId===t?``:f.editingCommentId,f.editingCommentBody=f.editingCommentId?f.editingCommentBody:``,N(),f.drawerOpen?await C():x(),$(),w(),f.busyCommentId=``,Q()}catch(e){f.error=e instanceof Error?e.message:`Could not delete comment.`,f.busyCommentId=``,Q()}}}function $e(e){let t=O(e);f.replyingCommentId=String(t?.id||``).trim(),f.activeThreadId=f.replyingCommentId||f.activeThreadId,Ce(f.replyingCommentId,!1),f.replyBody=``,f.error=``,Q()}function et(){f.replyingCommentId=``,f.replyBody=``,Q()}async function tt(t){let n=String(f.replyBody||``).trim();if(!(!t||!n||f.busyCommentId)){f.busyCommentId=t,f.error=``,Q();try{let r=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`reply`,project:f.projectKey,page:f.pageKey,commentId:t,body:n})}),i=await r.json();if(!r.ok||!i?.ok)throw Error(i?.error||`Could not save reply.`);f.comments=Array.isArray(i.comments)?i.comments:f.comments,f.users=Array.isArray(i.users)?i.users:f.users,f.canDeleteAnyComment=!!i.canDeleteAnyComment,f.replyingCommentId=``,f.replyBody=``,f.busyCommentId=``,f.shouldStickToBottom=!0,f.lastSeenCommentId=f.comments.at(-1)?.id||f.lastSeenCommentId,f.lastSeenAt=y(f.comments.at(-1))||f.lastSeenAt,N(),$(),w(),Q()}catch(e){f.error=e instanceof Error?e.message:`Could not save reply.`,f.busyCommentId=``,Q()}}}async function G(t,n,r){if(!(!t||f.busyCommentId)){f.busyCommentId=t,f.error=``,Q();try{let i=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:n,project:f.projectKey,page:f.pageKey,commentId:t})}),a=await i.json();if(!i.ok||!a?.ok)throw Error(a?.error||r);f.comments=Array.isArray(a.comments)?a.comments:f.comments,f.users=Array.isArray(a.users)?a.users:f.users,f.canDeleteAnyComment=!!a.canDeleteAnyComment,f.busyCommentId=``,f.lastSeenCommentId=String(a.lastSeenCommentId||f.lastSeenCommentId||``),f.lastSeenAt=Number(a.lastSeenAt)||f.lastSeenAt,N(),$(),w(),Q()}catch(e){f.error=e instanceof Error?e.message:r,f.busyCommentId=``,Q()}}}async function nt(e){try{await navigator.clipboard.writeText(e.body),f.copiedCommentId=e.id,Q(),window.setTimeout(()=>{f.copiedCommentId===e.id&&(f.copiedCommentId=``,Q())},1200)}catch{f.error=`Could not copy comment.`,Q()}}function rt(e){if(!o.querySelector(`[data-comments-input]`)||!f.mention)return;let t=`@${e.fullName} `,n=f.body.slice(0,f.mention.start)+t+f.body.slice(f.mention.end),r=f.mention.start+t.length;f.body=n,f.mention=null,f.mentionIndex=0,Q();let i=o.querySelector(`[data-comments-input]`);i&&(i.focus(),i.setSelectionRange(r,r))}function K(){let e=o.querySelector(`[data-comments-input]`);e&&(f.body=e.value,f.mention=ke(e.value,e.selectionStart||0),f.mentionIndex=0,Q())}function q(e){e&&(e.style.height=`auto`,e.style.height=`${Math.max(e.scrollHeight,96)}px`)}function it(e,t={}){let{compact:n=!1}=t,r=fe(e),i=T(e.fileName||`Attachment`);if(le(e)&&r)return`<img src="${E(r)}" alt="${i}" loading="lazy" />`;if(ue(e)&&r)return`<video src="${E(r)}" muted playsinline preload="metadata"></video>`;let a=de(e)?`PDF`:pe(e);return`<span class="comments-panel__asset-glyph${n?` is-compact`:``}">${T(a)}</span>`}function J(e,t={}){let{pending:n=!1,compact:r=!1,context:i=`comment`}=t,a=String(e.id||``).trim(),o=T(e.fileName||`Attachment`),s=T(me(e.pageId)),c=i===`uploads`&&!n,l=c&&f.uploadsDeletingAssetId===a,u=`
      <button
        type="button"
        class="comments-panel__asset-card${r?` is-compact`:``}${n?` is-pending`:``}"
        data-asset-open="${a}"
        data-asset-context="${E(i)}"
      >
        <span class="comments-panel__asset-preview">
          ${it(e,{compact:r})}
        </span>
        <span class="comments-panel__asset-copy">
          <strong>${o}</strong>
          <small>${T(`${s} · ${ce(e.sizeBytes)}`)}</small>
        </span>
        ${n?`
                <span class="comments-panel__asset-remove-wrap">
                  <span class="comments-panel__asset-remove" data-pending-asset-remove="${a}" aria-label="Remove attachment">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6 18 18"></path>
                      <path d="M18 6 6 18"></path>
                    </svg>
                  </span>
                </span>
              `:``}
      </button>
    `;return c?`
      <div class="comments-panel__asset-card-shell">
        ${u}
        <span class="comments-panel__asset-delete-wrap">
          <button
            type="button"
            class="comments-panel__asset-delete"
            data-uploads-asset-delete="${a}"
            data-tooltip="Delete"
            aria-label="Delete asset"
            ${l?`disabled`:``}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4h6"></path>
              <path d="M4 7h16"></path>
              <path d="M7 7v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"></path>
              <path d="M10 11v5"></path>
              <path d="M14 11v5"></path>
            </svg>
          </button>
        </span>
      </div>
    `:u}function at(){return f.pendingAssets.length?`
      <div class="comments-panel__pending-assets">
        ${f.pendingAssets.map(e=>J(e,{pending:!0,compact:!0,context:`pending`})).join(``)}
      </div>
    `:``}function ot(e=[]){return!Array.isArray(e)||!e.length?``:`
      <div class="comments-panel__assets">
        ${e.map(e=>J(e,{compact:!0,context:`comment`})).join(``)}
      </div>
    `}function st(e){let t=e?.selectionTarget,n=String(t?.layerPath||``).trim();if(!n)return``;let r=String(t?.layerLabel||``).trim()||`Referenced layer`;return`
      <button
        type="button"
        class="comments-panel__selection-target"
        data-comment-selection-target="${E(n)}"
        data-comment-selection-page="${E(String(t?.pageId||``).trim().toLowerCase())}"
        aria-label="Highlight referenced layer"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5V6a2 2 0 0 1 2-2h3.5"></path>
          <path d="M14.5 4H18a2 2 0 0 1 2 2v3.5"></path>
          <path d="M20 14.5V18a2 2 0 0 1-2 2h-3.5"></path>
          <path d="M9.5 20H6a2 2 0 0 1-2-2v-3.5"></path>
        </svg>
        <span>${T(r)}</span>
      </button>
    `}function ct(e){let t=String(e?.id||``).trim(),n=f.busyCommentId===t;return f.replyingCommentId===t?`
      <div class="comments-panel__reply-composer">
        <textarea
          data-comment-reply-input="${t}"
          placeholder="Write a reply"
        >${T(f.replyBody)}</textarea>
        <div class="comments-panel__reply-actions">
          <button
            type="button"
            class="comments-panel__edit-button comments-panel__edit-button--secondary"
            data-comment-action="cancel-reply"
            data-comment-id="${t}"
            ${n?`disabled`:``}
          >Cancel</button>
          <button
            type="button"
            class="comments-panel__edit-button"
            data-comment-action="submit-reply"
            data-comment-id="${t}"
            ${n?`disabled`:``}
          >${n?`Saving…`:`Reply`}</button>
        </div>
      </div>
    `:``}function lt(e){if(!e)return``;let t=[],n=String(e.latestComment?.author?.fullName||``).trim();return e.replyCount&&t.push(`${e.replyCount} ${e.replyCount===1?`reply`:`replies`}`),n&&t.push(`Latest by ${n}`),t.push(`Updated ${se(e.latestComment?.editedAt||e.latestComment?.createdAt||e.rootComment?.createdAt)}`),`
      <div class="comments-panel__thread-summary" aria-label="Thread summary">
        ${t.map(e=>`<span>${T(e)}</span>`).join(`<span aria-hidden="true">·</span>`)}
      </div>
    `}function ut(e){let t=e.filter(e=>e.isUnread&&!e.isResolved).length,n=e.filter(e=>e.isResolved).length;return`
      <div class="comments-panel__toolbar">
        <button
          type="button"
          class="comments-panel__filter-toggle${f.showUnreadOnly?` is-active`:``}"
          data-comment-filter="unread"
          aria-pressed="${f.showUnreadOnly?`true`:`false`}"
        >
          Unread only
          ${t?`<span>${t}</span>`:``}
        </button>
        ${n?`<p class="comments-panel__toolbar-meta">${n} resolved ${n===1?`thread`:`threads`}</p>`:``}
      </div>
    `}function dt(e,t,n,r={}){let{emptyMessage:i=``}=r;return!n.length&&!i?``:`
      <section class="comments-panel__section">
        <div class="comments-panel__section-header">
          <div class="comments-panel__section-copy">
            <h3>${T(e)}</h3>
            ${t?`<p>${T(t)}</p>`:``}
          </div>
          <span class="comments-panel__section-count">${n.length}</span>
        </div>
        ${n.length?`
                <div class="comments-panel__section-list">
                  ${n.map(e=>{let{rootComment:t,replies:n,isCollapsed:r}=e;return`
                        <section class="comments-panel__thread-group${r?` is-collapsed`:``}" data-comment-thread-group="${t.id}">
                          ${Y(t,{comments:f.comments,threadView:e})}
                        </section>
                      `}).join(``)}
                </div>
              `:`<div class="comments-panel__empty">${T(i)}</div>`}
      </section>
    `}function Y(e,t={}){let{comments:n=f.comments,isReply:r=!1,threadView:i=null,inThreadView:a=!1}=t,o=h(),s=String(e.author?.email||``).toLowerCase()===o,c=s,l=s||f.canDeleteAnyComment,u=f.editingCommentId===e.id,d=f.busyCommentId===e.id,p=f.copiedCommentId===e.id,m=O(e,n),g=we(e,n),_=String(g?.layerPath||``).trim(),v=String(g?.pageId||``).trim().toLowerCase(),y=i?.isResolved??be(m),b=i?.isUnread??j(m,n),x=i?.replyCount??k(m,n).length,S=`
      <div class="comments-panel__actions" role="menu" aria-label="Comment actions">
        <button type="button" class="comments-panel__action" data-comment-action="copy" data-comment-id="${e.id}" aria-label="${p?`Copied`:`Copy comment`}" title="${p?`Copied`:`Copy`}">
          ${p?`
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5 9.2 16.5 19 7.5"></path>
                </svg>
              `:`
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                  <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
                </svg>
              `}
        </button>
        ${r?``:`
                <button type="button" class="comments-panel__action" data-comment-action="${y?`reopen`:`resolve`}" data-comment-id="${m.id}" aria-label="${y?`Reopen comment`:`Resolve comment`}" title="${y?`Reopen`:`Resolve`}">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M8.5 12 11 14.5 15.5 9.5"></path>
                  </svg>
                </button>
                <button type="button" class="comments-panel__action" data-comment-action="${b?`mark-read`:`mark-unread`}" data-comment-id="${m.id}" aria-label="${b?`Mark thread read`:`Mark thread unread`}" title="${b?`Mark read`:`Mark unread`}">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4.5 7.5h15"></path>
                    <path d="M4.5 12h15"></path>
                    <path d="M4.5 16.5h9"></path>
                  </svg>
                </button>
                <button type="button" class="comments-panel__action" data-comment-action="reply" data-comment-id="${m.id}" aria-label="Reply to comment" title="Reply">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 9H5a2 2 0 0 0-2 2v8l4-3h7a2 2 0 0 0 2-2v-1"></path>
                    <path d="M15 5h4a2 2 0 0 1 2 2v8l-4-3h-2"></path>
                  </svg>
                </button>
              `}
        ${c?`
                <button type="button" class="comments-panel__action" data-comment-action="edit" data-comment-id="${e.id}" aria-label="Edit comment" title="Edit">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"></path>
                    <path d="M13.5 6.5 17.5 10.5"></path>
                  </svg>
                </button>
              `:``}
        ${l?`
                <button type="button" class="comments-panel__action comments-panel__action--destructive" data-comment-action="delete" data-comment-id="${e.id}" aria-label="Delete comment" title="Delete" ${d?`disabled`:``}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16"></path>
                    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    <path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                  </svg>
                </button>
              `:``}
      </div>
    `;return`
      <article
        class="comments-panel__item${s?` is-own`:``}${r?` is-reply`:``}${_?` is-targeted`:``}${y?` is-resolved`:``}${b?` is-unread`:``}"
        data-comment-id="${e.id}"
        ${_?`data-comment-thread-target="${E(_)}"`:``}
        ${v?`data-comment-thread-page="${E(v)}"`:``}
      >
        <div class="comments-panel__message-wrap">
          ${S}
          <div class="comments-panel__meta-line">
            <strong>${T(e.author?.fullName||`Unknown user`)}</strong>
            <span>${T(ve(e))}</span>
            ${r?`<small class="comments-panel__reply-label">Reply</small>`:``}
            ${!r&&y?`<small class="comments-panel__status-chip">Resolved</small>`:``}
            ${!r&&b?`<span class="comments-panel__unread-dot" aria-hidden="true"></span>`:``}
          </div>
          <div class="comments-panel__bubble">
            ${u?`
                  <div class="comments-panel__edit">
                    <textarea data-comment-edit-input="${e.id}">${T(f.editingCommentBody)}</textarea>
                    <div class="comments-panel__edit-actions">
                      <button type="button" class="comments-panel__edit-button comments-panel__edit-button--secondary" data-comment-action="cancel-edit" data-comment-id="${e.id}" ${d?`disabled`:``}>Cancel</button>
                      <button type="button" class="comments-panel__edit-button" data-comment-action="save-edit" data-comment-id="${e.id}" ${d?`disabled`:``}>${d?`Saving…`:`Save`}</button>
                    </div>
                  </div>
                `:`
                    ${r?``:lt(i||{rootComment:m,latestComment:A(m,n)||m,replyCount:x})}
                    ${r?``:st(e)}
                    ${e.body?`<div class="comments-panel__body">${Oe(e.body,e.mentions||[])}</div>`:``}
                    ${ot(e.assets||[])}
                    ${r?``:`
                            <div class="comments-panel__thread-footer">
                              <button type="button" class="comments-panel__thread-link" data-comment-action="${x?`open-thread`:`reply`}" data-comment-id="${m.id}">
                                ${x?`${x} ${x===1?`reply`:`replies`}`:`Reply`}
                              </button>
                              ${x&&a?`
                                      <button type="button" class="comments-panel__thread-link" data-comment-action="close-thread" data-comment-id="${m.id}">
                                        Back to all comments
                                      </button>
                                    `:``}
                              <button type="button" class="comments-panel__thread-link" data-comment-action="${y?`reopen`:`resolve`}" data-comment-id="${m.id}">
                                ${y?`Reopen`:`Resolve`}
                              </button>
                              <button type="button" class="comments-panel__thread-link" data-comment-action="${b?`mark-read`:`mark-unread`}" data-comment-id="${m.id}">
                                ${b?`Mark read`:`Mark unread`}
                              </button>
                            </div>
                          `}
                  `}
          </div>
        </div>
      </article>
    `}function ft(e){if(!e)return``;let{rootComment:t,replies:n}=e;return`
      <section class="comments-panel__thread-detail">
        <div class="comments-panel__thread-detail-header">
          <button
            type="button"
            class="comments-panel__thread-back"
            data-comment-action="close-thread"
            data-comment-id="${t.id}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18 9 12 15 6"></path>
            </svg>
            <span>All comments</span>
          </button>
          <div class="comments-panel__thread-detail-copy">
            <h3>Thread</h3>
            <p>${T(`${1+n.length} ${1+n.length===1?`comment`:`comments`}`)}</p>
          </div>
        </div>
        <div class="comments-panel__thread-detail-list">
          ${Y(t,{comments:f.comments,threadView:e,inThreadView:!0})}
          ${n.length?`<div class="comments-panel__replies comments-panel__replies--detail">${n.map(e=>Y(e,{comments:f.comments,isReply:!0,inThreadView:!0})).join(``)}</div>`:``}
          ${ct(t)}
        </div>
      </section>
    `}function pt(){if(f.isLoading)return`<div class="comments-panel__empty">Loading comments…</div>`;if(f.error&&!f.comments.length)return`<div class="comments-panel__empty comments-panel__empty--error">${T(f.error)}</div>`;if(!f.comments.length)return`<div class="comments-panel__empty">No comments yet. Start the conversation for this page.</div>`;let e=Se(f.comments),t=f.activeThreadId&&e.find(e=>String(e.rootComment?.id||``).trim()===f.activeThreadId)||null;if(f.activeThreadId&&!t&&(f.activeThreadId=``),t)return ft(t);let n=(f.showUnreadOnly?e.filter(e=>e.isUnread&&!e.isResolved):e).filter(e=>!e.isResolved),r=f.showUnreadOnly?[]:e.filter(e=>e.isResolved);return`
      ${ut(e)}
      ${dt(f.showUnreadOnly?`Unread threads`:`Open threads`,f.showUnreadOnly?`Threads that still need attention.`:`Active feedback and discussion for this page.`,n,{emptyMessage:f.showUnreadOnly?`Everything is caught up right now.`:`No open threads yet. Start the conversation for this page.`})}
      ${f.showUnreadOnly?``:dt(`Resolved`,`Threads that have been closed out.`,r)}
    `}function mt(e,t){return t.map(e=>e.id).join(`|`)!==e}function ht(e){return e?e.scrollHeight-e.scrollTop-e.clientHeight<=32:!0}function gt(e){e&&(e.scrollTop=e.scrollHeight)}function _t(){return f.mention?.suggestions?.length?`
      <div class="comments-panel__mentions" data-comments-mentions>
        ${f.mention.suggestions.map((e,t)=>`
              <button
                type="button"
                class="comments-panel__mention-option ${t===f.mentionIndex?`is-active`:``}"
                data-mention-index="${t}"
              >
                <span class="comments-panel__mention-avatar" style="--avatar-bg:${T(e.avatarColor||``)}">${T(oe(e.fullName))}</span>
                <span class="comments-panel__mention-copy">
                  <strong>${T(e.fullName)}</strong>
                  <small>${T(e.email)}</small>
                </span>
              </button>
            `).join(``)}
      </div>
    `:``}function vt(){let e=!!(f.body.trim()||f.pendingAssets.length)&&!f.isSubmitting;return`
      <div class="comments-panel__composer">
        ${at()}
        <div class="comments-panel__field">
          <div class="comments-panel__input-wrap">
            <textarea
              data-comments-input
              placeholder="Type a message"
            >${T(f.body)}</textarea>
            <button
              type="button"
              class="comments-panel__attach"
              data-comments-attach
              aria-label="Attach files"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.5 6.5 9 14a3 3 0 1 0 4.24 4.24l7-7a5 5 0 0 0-7.07-7.07l-8 8"></path>
              </svg>
            </button>
            <button
              type="button"
              class="comments-panel__send"
              data-comments-submit
              aria-label="Post comment"
              ${e?``:`disabled`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5 12 19"></path>
                <path d="M6 11 12 5 18 11"></path>
              </svg>
            </button>
          </div>
        </div>
        ${_t()}
        ${f.error?`<p class="comments-panel__status comments-panel__status--error">${T(f.error)}</p>`:``}
        <div class="comments-panel__composer-actions">
          <p class="comments-panel__hint">Comments and uploads are saved to this page for everyone in the project.</p>
        </div>
      </div>
    `}function X(){s.innerHTML=`
      <div class="uploads-panel__inner">
        <div class="uploads-panel__header">
          <div class="uploads-panel__header-copy">
            <p class="uploads-panel__eyebrow">Uploads</p>
            <h2>Project Assets</h2>
            <p>Browse uploaded files for ${T(f.pageLabel)} and the rest of this project.</p>
          </div>
          <div class="uploads-panel__header-actions">
            <button class="uploads-panel__add" type="button" data-uploads-add ${f.uploadsSubmitting?`disabled`:``}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
              </svg>
              <span>${f.uploadsSubmitting?`Uploading…`:`Add files`}</span>
            </button>
            <button class="uploads-panel__close" type="button" data-uploads-close aria-label="Close uploads">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18"></path>
                <path d="M18 6 6 18"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="uploads-panel__list" data-uploads-list>
          ${f.uploadsLoading?`<div class="uploads-panel__empty">Loading uploads…</div>`:f.uploadsError?`<div class="uploads-panel__empty uploads-panel__empty--error">${T(f.uploadsError)}</div>`:f.uploads.length?f.uploads.map(e=>`
                      <div class="uploads-panel__item">
                        ${J(e,{context:`uploads`})}
                      </div>
                    `).join(``):`<div class="uploads-panel__empty">No assets yet. Add files here to start building the project library for this page.</div>`}
        </div>
      </div>
    `,s.querySelector(`[data-uploads-close]`)?.addEventListener(`click`,()=>{z(!1)}),s.querySelector(`[data-uploads-add]`)?.addEventListener(`click`,()=>{Pe(`uploads`)}),s.querySelectorAll(`[data-asset-open]`).forEach(e=>{e.addEventListener(`click`,()=>{Ue(e.getAttribute(`data-asset-open`))})}),s.querySelectorAll(`[data-uploads-asset-delete]`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault(),t.stopPropagation(),Ge(e.getAttribute(`data-uploads-asset-delete`))})}),L()}function Z(){let e=f.assetViewerAsset;if(!e){c.hidden=!0,c.innerHTML=``,document.body.classList.remove(`asset-viewer-open`);return}let t=fe(e),n=T(e.fileName||`Attachment`),r=T(`${T(me(e.pageId))} · ${ce(e.sizeBytes)}`),i=f.assetViewerItems.length>1,a=Be(f.assetViewerScaleMode),o=`
      <div class="asset-viewer__empty">
        <strong>${n}</strong>
        <p>Preview is not available for this file type.</p>
      </div>
    `;le(e)&&t?o=`<img class="asset-viewer__image" src="${E(t)}" alt="${n}" />`:ue(e)&&t?o=`<video class="asset-viewer__video" src="${E(t)}" controls playsinline></video>`:de(e)&&t&&(o=`<iframe class="asset-viewer__pdf" src="${E(t)}" title="${n}"></iframe>`),c.hidden=!1,document.body.classList.add(`asset-viewer-open`),c.innerHTML=`
      <div class="asset-viewer__backdrop" data-asset-viewer-close></div>
      <div class="asset-viewer__surface" role="dialog" aria-modal="true" aria-label="${n}">
        <div class="asset-viewer__topbar">
          <div class="asset-viewer__copy">
            <h3>${n}</h3>
            <p>${r}</p>
          </div>
          <div class="asset-viewer__center">
            <div class="asset-viewer__scale-wrap">
              <div class="preview-scale-select asset-viewer__scale" data-asset-viewer-scale data-value="${E(f.assetViewerScaleMode)}" data-open="${f.assetViewerScaleMenuOpen?`true`:`false`}">
                <button
                  type="button"
                  class="preview-scale-trigger"
                  data-asset-viewer-scale-trigger
                  aria-haspopup="menu"
                  aria-expanded="${f.assetViewerScaleMenuOpen?`true`:`false`}"
                  aria-label="Scale asset"
                >
                  <span class="preview-scale-trigger__icon" aria-hidden="true"></span>
                  <span class="preview-scale-select__label">${T(ze(f.assetViewerScaleMode))}</span>
                  <span class="preview-scale-trigger__chevron" aria-hidden="true"></span>
                </button>
                <div class="preview-scale-menu asset-viewer__scale-menu" data-asset-viewer-scale-menu role="menu" ${f.assetViewerScaleMenuOpen?``:`hidden`}>
                  <button type="button" class="preview-scale-menu__item ${f.assetViewerScaleMode===`fit`?`is-active`:``}" data-asset-viewer-scale-option="fit" role="menuitemradio" aria-checked="${f.assetViewerScaleMode===`fit`?`true`:`false`}">Fit</button>
                  <button type="button" class="preview-scale-menu__item ${f.assetViewerScaleMode===`0.5`?`is-active`:``}" data-asset-viewer-scale-option="0.5" role="menuitemradio" aria-checked="${f.assetViewerScaleMode===`0.5`?`true`:`false`}">50%</button>
                  <button type="button" class="preview-scale-menu__item ${f.assetViewerScaleMode===`0.75`?`is-active`:``}" data-asset-viewer-scale-option="0.75" role="menuitemradio" aria-checked="${f.assetViewerScaleMode===`0.75`?`true`:`false`}">75%</button>
                  <button type="button" class="preview-scale-menu__item ${f.assetViewerScaleMode===`1`?`is-active`:``}" data-asset-viewer-scale-option="1" role="menuitemradio" aria-checked="${f.assetViewerScaleMode===`1`?`true`:`false`}">100%</button>
                  <button type="button" class="preview-scale-menu__item ${f.assetViewerScaleMode===`1.5`?`is-active`:``}" data-asset-viewer-scale-option="1.5" role="menuitemradio" aria-checked="${f.assetViewerScaleMode===`1.5`?`true`:`false`}">150%</button>
                  <button type="button" class="preview-scale-menu__item ${f.assetViewerScaleMode===`2`?`is-active`:``}" data-asset-viewer-scale-option="2" role="menuitemradio" aria-checked="${f.assetViewerScaleMode===`2`?`true`:`false`}">200%</button>
                </div>
              </div>
              <span class="asset-viewer__control-tooltip" aria-hidden="true">Scaling</span>
            </div>
          </div>
          <div class="asset-viewer__actions">
            ${i?`
                    <button type="button" class="asset-viewer__nav asset-viewer__icon-control" data-asset-viewer-prev aria-label="Previous asset">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15 6 9 12l6 6"></path>
                      </svg>
                    </button>
                    <button type="button" class="asset-viewer__nav asset-viewer__icon-control" data-asset-viewer-next aria-label="Next asset">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 6 6 6-6 6"></path>
                      </svg>
                    </button>
                  `:``}
            ${t?`
                    <a
                      class="asset-viewer__download asset-viewer__icon-control"
                      href="${E(`${t}${t.includes(`?`)?`&`:`?`}download=1`)}"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Download asset"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 4v10"></path>
                        <path d="m8 10 4 4 4-4"></path>
                        <path d="M5 18h14"></path>
                      </svg>
                      <span class="asset-viewer__control-tooltip" aria-hidden="true">Download</span>
                    </a>
                  `:``}
            <button type="button" class="asset-viewer__close asset-viewer__icon-control" data-asset-viewer-close aria-label="Close asset viewer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18"></path>
                <path d="M18 6 6 18"></path>
              </svg>
              <span class="asset-viewer__control-tooltip" aria-hidden="true">Close</span>
            </button>
          </div>
        </div>
        <div class="asset-viewer__viewport">
          <div class="asset-viewer__canvas" style="--asset-viewer-scale:${a};">
            ${o}
          </div>
        </div>
      </div>
    `,c.querySelectorAll(`[data-asset-viewer-close]`).forEach(e=>{e.addEventListener(`click`,V)}),c.querySelector(`[data-asset-viewer-prev]`)?.addEventListener(`click`,()=>{B(f.assetViewerIndex-1)}),c.querySelector(`[data-asset-viewer-next]`)?.addEventListener(`click`,()=>{B(f.assetViewerIndex+1)}),c.querySelector(`[data-asset-viewer-scale-trigger]`)?.addEventListener(`click`,()=>{f.assetViewerScaleMenuOpen=!f.assetViewerScaleMenuOpen,Ve()}),c.querySelectorAll(`[data-asset-viewer-scale-option]`).forEach(e=>{e.addEventListener(`click`,()=>{He(e.getAttribute(`data-asset-viewer-scale-option`))})}),c.onclick=e=>{let t=c.querySelector(`[data-asset-viewer-scale]`),n=c.querySelector(`.asset-viewer__backdrop`);c.querySelector(`.asset-viewer__viewport`),c.querySelector(`.asset-viewer__canvas`),f.assetViewerScaleMenuOpen&&t&&!t.contains(e.target)&&(f.assetViewerScaleMenuOpen=!1,Ve()),!(e.target.closest(`.asset-viewer__copy`)||e.target.closest(`.asset-viewer__actions`)||e.target.closest(`.asset-viewer__center`)||e.target.closest(`.asset-viewer__image`)||e.target.closest(`.asset-viewer__video`)||e.target.closest(`.asset-viewer__pdf`)||e.target.closest(`.asset-viewer__empty`))&&e.target===n&&V()}}function Q(){let e=document.activeElement,t=o.querySelector(`[data-comments-thread]`),n=f.shouldStickToBottom||ht(t),r=!n&&t?t.scrollTop:null,i=e?.matches?.(`[data-comments-input]`),a=i?e.selectionStart:null,s=i?e.selectionEnd:null,c=e?.getAttribute?.(`data-comment-reply-input`),l=!!c,u=l?e.selectionStart:null,d=l?e.selectionEnd:null,p=e?.getAttribute?.(`data-comment-edit-input`),m=!!p,h=m?e.selectionStart:null,g=m?e.selectionEnd:null;o.innerHTML=`
      <div class="comments-panel__inner">
        <div class="comments-panel__header">
          <div class="comments-panel__header-copy">
            <p class="comments-panel__eyebrow">Comments</p>
            <h2>Page Discussion</h2>
            <p>Collaborate on ${T(f.pageLabel)} and tag teammates with @mentions.</p>
          </div>
          <button class="comments-panel__close" type="button" data-comments-close aria-label="Close comments">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div class="comments-panel__thread" data-comments-thread>
          ${pt()}
        </div>
        ${vt()}
      </div>
    `;let _=o.querySelector(`[data-comments-input]`),v=o.querySelector(`[data-comments-thread]`);if(v?.addEventListener(`scroll`,()=>{f.shouldStickToBottom=ht(v)}),q(_),_?.addEventListener(`input`,()=>{q(_),K()}),_?.addEventListener(`click`,K),_?.addEventListener(`keyup`,K),_?.addEventListener(`keydown`,e=>{if(!f.mention?.suggestions?.length){e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),Je());return}if(e.key===`ArrowDown`){e.preventDefault(),f.mentionIndex=(f.mentionIndex+1)%f.mention.suggestions.length,Q(),o.querySelector(`[data-comments-input]`)?.focus();return}if(e.key===`ArrowUp`){e.preventDefault(),f.mentionIndex=(f.mentionIndex-1+f.mention.suggestions.length)%f.mention.suggestions.length,Q(),o.querySelector(`[data-comments-input]`)?.focus();return}if(e.key===`Enter`&&f.mention){e.preventDefault(),rt(f.mention.suggestions[f.mentionIndex]);return}e.key===`Escape`&&(f.mention=null,f.mentionIndex=0,Q())}),o.querySelector(`[data-comments-close]`)?.addEventListener(`click`,()=>{F(!1)}),o.querySelector(`[data-comments-submit]`)?.addEventListener(`click`,()=>{Je()}),o.querySelector(`[data-comments-attach]`)?.addEventListener(`click`,()=>{Pe(`comments`)}),o.querySelectorAll(`[data-comment-filter]`).forEach(e=>{e.addEventListener(`click`,()=>{e.getAttribute(`data-comment-filter`)===`unread`&&(f.showUnreadOnly=!f.showUnreadOnly,Q())})}),o.querySelectorAll(`[data-comment-action]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-comment-action`),n=e.getAttribute(`data-comment-id`),r=f.comments.find(e=>e.id===n);if(!(!t||!n||!r)){if(t===`copy`){nt(r);return}if(t===`edit`){Ye(r);return}if(t===`cancel-edit`){Xe();return}if(t===`save-edit`){Ze(n);return}if(t===`delete`){Qe(n);return}if(t===`reply`){$e(r);return}if(t===`open-thread`){let e=O(r);f.activeThreadId=String(e?.id||``).trim(),Q();return}if(t===`close-thread`){f.activeThreadId=``,f.replyingCommentId===n&&(f.replyingCommentId=``,f.replyBody=``),Q();return}if(t===`toggle-thread`){let e=O(r),t=String(e?.id||``).trim();Ce(t,!M(t)),Q();return}if(t===`cancel-reply`){et();return}if(t===`submit-reply`){tt(n);return}if(t===`resolve`){G(n,`resolve`,`Could not resolve comment.`);return}if(t===`reopen`){G(n,`reopen`,`Could not reopen comment.`);return}if(t===`mark-read`){G(n,`markread`,`Could not mark comment read.`);return}t===`mark-unread`&&G(n,`markunread`,`Could not mark comment unread.`)}})}),o.querySelectorAll(`[data-comment-reply-input]`).forEach(e=>{e.addEventListener(`input`,()=>{f.replyBody=e.value}),e.addEventListener(`keydown`,t=>{if(t.key===`Escape`){t.preventDefault(),et();return}t.key===`Enter`&&(t.metaKey||t.ctrlKey)&&(t.preventDefault(),tt(e.getAttribute(`data-comment-reply-input`)))})}),o.querySelectorAll(`[data-comment-edit-input]`).forEach(e=>{e.addEventListener(`input`,()=>{f.editingCommentBody=e.value}),e.addEventListener(`keydown`,t=>{if(t.key===`Escape`){t.preventDefault(),Xe();return}t.key===`Enter`&&(t.metaKey||t.ctrlKey)&&(t.preventDefault(),Ze(e.getAttribute(`data-comment-edit-input`)))})}),o.querySelectorAll(`[data-mention-index]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=f.mention?.suggestions?.[Number(e.dataset.mentionIndex)];t&&rt(t)})}),o.querySelectorAll(`[data-pending-asset-remove]`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault(),t.stopPropagation(),je(e.getAttribute(`data-pending-asset-remove`))})}),o.querySelectorAll(`[data-asset-open]`).forEach(e=>{e.addEventListener(`click`,()=>{Ue(e.getAttribute(`data-asset-open`))})}),o.querySelectorAll(`[data-comment-selection-target]`).forEach(e=>{let t=()=>{window.dispatchEvent(new CustomEvent(`uxbridge:comment-selection-hover`,{detail:{pageId:String(e.getAttribute(`data-comment-selection-page`)||``).trim().toLowerCase(),layerPath:String(e.getAttribute(`data-comment-selection-target`)||``).trim()}}))},n=()=>{window.dispatchEvent(new CustomEvent(`uxbridge:comment-selection-leave`))};e.addEventListener(`mouseenter`,t),e.addEventListener(`focus`,t),e.addEventListener(`mouseleave`,n),e.addEventListener(`blur`,n)}),o.querySelectorAll(`[data-comment-thread-target]`).forEach(e=>{let t=()=>{window.dispatchEvent(new CustomEvent(`uxbridge:comment-selection-hover`,{detail:{pageId:String(e.getAttribute(`data-comment-thread-page`)||``).trim().toLowerCase(),layerPath:String(e.getAttribute(`data-comment-thread-target`)||``).trim()}}))},n=()=>{window.dispatchEvent(new CustomEvent(`uxbridge:comment-selection-leave`))};e.addEventListener(`mouseenter`,t),e.addEventListener(`focusin`,t),e.addEventListener(`mouseleave`,n),e.addEventListener(`focusout`,t=>{(!(t.relatedTarget instanceof Node)||!e.contains(t.relatedTarget))&&n()}),e.addEventListener(`click`,t=>{t.target instanceof Element&&t.target.closest(`[data-comment-action], [data-asset-open], [data-pending-asset-remove], [data-comment-edit-input], [data-comment-reply-input], textarea, button, a`)||window.dispatchEvent(new CustomEvent(`uxbridge:comment-selection-select`,{detail:{pageId:String(e.getAttribute(`data-comment-thread-page`)||``).trim().toLowerCase(),layerPath:String(e.getAttribute(`data-comment-thread-target`)||``).trim()}}))})}),i){let e=o.querySelector(`[data-comments-input]`);e&&(e.focus(),q(e),e.setSelectionRange(a??f.body.length,s??f.body.length))}if(n?(requestAnimationFrame(()=>{gt(v)}),f.shouldStickToBottom=!0):v&&r!==null&&requestAnimationFrame(()=>{v.scrollTop=r}),m&&p){let e=o.querySelector(`[data-comment-edit-input="${p}"]`);e&&(e.focus(),e.setSelectionRange(h??f.editingCommentBody.length,g??f.editingCommentBody.length))}if(l&&c){let e=o.querySelector(`[data-comment-reply-input="${c}"]`);e&&(e.focus(),e.setSelectionRange(u??f.replyBody.length,d??f.replyBody.length))}}function $(){let e=document.querySelector(`[data-comments-drawer-toggle]`);if(!e)return;let t=e.querySelector(`[data-comments-badge]`);if(t){if(!f.unseenCount||f.drawerOpen){t.hidden=!0,t.textContent=``;return}t.hidden=!1,t.textContent=String(f.unseenCount>99?`99+`:f.unseenCount)}}function yt(){let e=window.UXBridgeActionRail?.renderButtonContent||(({icon:e,label:t,tooltipClass:n=``,trailingMarkup:r=``}={})=>`
          <span class="bridge-action-rail-button__tooltip${n?` ${n}`:``}" aria-hidden="true">${t||``}</span>
          ${{comments:`
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6.5c0-1.38 1.12-2.5 2.5-2.5h9c1.38 0 2.5 1.12 2.5 2.5v7c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H7.5C6.12 16 5 14.88 5 13.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M8 8.75h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M8 12h5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          `,files:`
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.5 6.5 8.38 13.62a3 3 0 0 0 4.24 4.24l8.13-8.13a4.5 4.5 0 0 0-6.36-6.36L6.26 11.5a6 6 0 1 0 8.49 8.49l6.36-6.36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          `}[e]||``}
          ${r||``}
        `),t=document.querySelector(`[data-side-actions]`),n=document.createElement(`button`);n.type=`button`,n.className=`bridge-action-rail-button comments-drawer-toggle`,n.setAttribute(`data-comments-drawer-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Comments`),n.innerHTML=e({icon:`comments`,label:`Comments`,tooltipClass:`comments-drawer-toggle__tooltip`,trailingMarkup:`<span class="comments-drawer-toggle__badge" data-comments-badge hidden></span>`}),n.addEventListener(`click`,()=>{F(!f.drawerOpen)});let r=document.createElement(`button`);r.type=`button`,r.className=`bridge-action-rail-button uploads-drawer-toggle`,r.setAttribute(`data-uploads-drawer-toggle`,``),r.setAttribute(`aria-expanded`,`false`),r.setAttribute(`aria-label`,`Uploads`),r.innerHTML=e({icon:`files`,label:`Files`,tooltipClass:`uploads-drawer-toggle__tooltip`}),r.addEventListener(`click`,()=>{z(!f.uploadsDrawerOpen)}),window.addEventListener(`uxbridge:drawer-open`,e=>{e.detail?.drawer!==`comments`&&F(!1,`comments`),e.detail?.drawer!==`uploads`&&z(!1,`uploads`)}),window.addEventListener(`uxbridge:comments-refresh-request`,e=>{let t=String(e.detail?.projectId||``).trim().toLowerCase(),n=String(e.detail?.pageId||``).trim().toLowerCase();t===String(f.projectKey||``).trim().toLowerCase()&&(n&&n!==String(f.pageKey||``).trim().toLowerCase()||(e.detail?.open&&F(!0,`comments`),H({silent:!1}),U()))}),t?(t.append(n),t.append(r)):(document.body.append(n),document.body.append(r)),P(),L(),$(),X()}async function bt(){let e=d?50:1;for(let t=0;t<e;t+=1){let e=ae();if(e.pageKey){f.projectKey=e.projectKey,f.pageKey=e.pageKey,f.pageLabel=e.pageLabel,yt(),Q(),await H(),await U(),await I({silent:!0}),Ke();return}await new Promise(e=>window.setTimeout(e,100))}}bt(),l.addEventListener(`change`,()=>{if(f.assetFilePickerContext===`uploads`){Fe(l.files);return}Ae(l.files)}),window.addEventListener(`beforeunload`,()=>{qe()}),window.addEventListener(`uxbridge:project-nav-rendered`,()=>{w(),U()}),u?.addEventListener(`click`,()=>{f.drawerOpen&&F(!1),f.uploadsDrawerOpen&&z(!1)}),window.addEventListener(`resize`,R),document.addEventListener(`visibilitychange`,W),window.addEventListener(`pageshow`,W),window.addEventListener(`focus`,W),document.addEventListener(`keydown`,e=>{if(e.key===`Escape`&&f.assetViewerAsset){V();return}if(f.assetViewerAsset&&f.assetViewerItems.length>1){if(e.key===`ArrowLeft`){e.preventDefault(),B(f.assetViewerIndex-1);return}e.key===`ArrowRight`&&(e.preventDefault(),B(f.assetViewerIndex+1))}})})();