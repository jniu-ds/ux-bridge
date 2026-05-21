(function(){let e=`/api/comments`,t=`/api/assets`,n=3e3,r={"/project-overview.html":`Project Overview`,"/building-preview.html":`Building overview`,"/l1-bonus-preview.html":`L1 Bonus preview`,"/l1-l2-bonus-preview.html":`L1/L2 Bonus preview`},i={"/project-overview.html":`overview`,"/building-preview.html":`building`,"/l1-bonus-preview.html":`l1-bonus`,"/l1-l2-bonus-preview.html":`l1-l2-bonus`},a=new URLSearchParams(window.location.search).get(`table-thumb`)===`1`,o=document.querySelector(`[data-comments-root]`),s=document.createElement(`aside`),c=document.createElement(`div`),l=document.createElement(`input`),u=(()=>{let e=document.querySelector(`[data-mobile-sheet-backdrop]`);if(e)return e;let t=document.createElement(`button`);return t.type=`button`,t.className=`bridge-mobile-sheet-backdrop`,t.setAttribute(`data-mobile-sheet-backdrop`,``),t.setAttribute(`aria-label`,`Close drawer`),t.hidden=!0,document.body.append(t),t})(),d=document.body.dataset.dynamicProject===`true`;if(!o||a)return;document.body.classList.add(`bridge-body--has-comments`),document.body.classList.add(`bridge-body--has-uploads`),s.className=`uploads-panel`,s.setAttribute(`data-uploads-root`,``),s.hidden=!0,document.body.append(s),c.className=`asset-viewer`,c.setAttribute(`data-asset-viewer-root`,``),c.hidden=!0,document.body.append(c),l.type=`file`,l.multiple=!0,l.hidden=!0,l.className=`comments-panel__file-input`,l.setAttribute(`data-comments-file-input`,``),document.body.append(l);let f={projectKey:``,pageKey:``,pageLabel:``,drawerOpen:!1,comments:[],users:[],isLoading:!0,isSubmitting:!1,error:``,body:``,mention:null,mentionIndex:0,refreshTimer:null,unseenCount:0,editingCommentId:``,editingCommentBody:``,busyCommentId:``,copiedCommentId:``,shouldStickToBottom:!0,pageCommentSummary:new Map,refreshTick:0,currentPageActivityAt:``,pendingAssets:[],uploads:[],uploadsLoading:!1,uploadsError:``,uploadsDrawerOpen:!1,assetViewerAsset:null,assetViewerItems:[],assetViewerIndex:0,assetViewerScaleMode:`fit`,assetViewerScaleMenuOpen:!1,lastSeenCommentId:``,lastSeenAt:0,lastPersistedSeenCommentId:``,lastPersistedSeenAt:0,canDeleteAnyComment:!1,commentsRequestToken:0,summaryRequestToken:0};function p(){if(window.uxBridgeUser?.email)return window.uxBridgeUser;try{let e=sessionStorage.getItem(`ux-bridge-user`);return e?JSON.parse(e):null}catch{return null}}function m(){return String(p()?.email||``).trim().toLowerCase()}function h(e=f.pageKey){let t=p();return`ux-bridge-comments-seen:${String(t?.email||`anonymous`).trim().toLowerCase()}:${f.projectKey}:${e}`}function g(e=f.pageKey){try{let t=localStorage.getItem(h(e));if(!t)return{lastSeenCommentId:``,lastSeenAt:0};let n=JSON.parse(t);return n&&typeof n==`object`?{lastSeenCommentId:String(n.lastSeenCommentId||``).trim(),lastSeenAt:Number(n.lastSeenAt)||0}:{lastSeenCommentId:String(t||``).trim(),lastSeenAt:0}}catch{return{lastSeenCommentId:``,lastSeenAt:0}}}function ee(e,t=0,n=f.pageKey){try{if(!e&&!t){localStorage.removeItem(h(n));return}localStorage.setItem(h(n),JSON.stringify({lastSeenCommentId:String(e||``).trim(),lastSeenAt:Number(t)||0}))}catch{}}function _(e){let t=Date.parse(String(e?.createdAt||``));if(Number.isFinite(t))return t;let n=Date.parse(String(e?.editedAt||``));return Number.isFinite(n)?n:0}function v(e,t=f.lastSeenAt,n=!1){let r=Array.isArray(e)?e:[];return!r.length||n?0:r.reduce((e,n)=>e+ +(_(n)>Number(t||0)),0)}function y(){f.unseenCount=v(f.comments,f.lastSeenAt,f.drawerOpen)}function b(e){let t=(Array.isArray(e)?e:[]).reduce((e,t)=>{let n=new Date(t.editedAt||t.createdAt||0).getTime();return Number.isNaN(n)?e:Math.max(e,n)},0);return t?new Date(t).toISOString():``}function x(){let e=f.pageCommentSummary.get(f.pageKey);f.currentPageActivityAt=String(e?.latestActivityAt||``)}async function S(){let t=f.comments.at(-1)||null,n=String(t?.id||``),r=_(t);if(f.lastSeenCommentId=n,f.lastSeenAt=r,f.unseenCount=0,ee(n,r),!(n===f.lastPersistedSeenCommentId&&r===Number(f.lastPersistedSeenAt||0))&&!(!f.projectKey||!f.pageKey))try{await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`markSeen`,project:f.projectKey,page:f.pageKey,commentId:n})}),f.lastPersistedSeenCommentId=n,f.lastPersistedSeenAt=r}catch{}}function te(){if(f.drawerOpen||f.unseenCount>0||f.uploadsDrawerOpen)return n;let e=Date.parse(String(f.currentPageActivityAt||``));return Number.isFinite(e)&&Date.now()-e<6e4?n:1e4}function ne(){return Array.from(document.querySelectorAll(`[data-project-page-key]`)).map(e=>String(e.dataset.projectPageKey||``).trim()).filter(Boolean)}function re(e){let t=e.querySelector(`[data-nav-comments-badge]`);return t||(t=document.createElement(`span`),t.className=`bridge-sidebar__comments-badge`,t.setAttribute(`data-nav-comments-badge`,``),t.hidden=!0,e.append(t),t)}function C(){document.querySelectorAll(`[data-project-page-key]`).forEach(e=>{let t=String(e.dataset.projectPageKey||``).trim();if(!t)return;let n=re(e),r=f.pageCommentSummary.get(t),i=t===f.pageKey?v(f.comments,f.lastSeenAt,f.drawerOpen):Number(r?.unreadCount||0);if(!i){n.hidden=!0,n.textContent=``;return}n.hidden=!1,n.textContent=String(i>99?`99+`:i)})}function ie(){let e=window.location.pathname;return{projectKey:document.body.dataset.projectKey||`brand-affiliate-mobile`,pageKey:document.body.dataset.pageKey||i[e],pageLabel:document.body.dataset.pageLabel||r[e]||document.querySelector(`.bridge-project-toolbar h1`)?.textContent?.trim()||`Page`}}function w(e){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function T(e){return w(e).replaceAll("`",`&#96;`)}function ae(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.slice(0,2).map(e=>e[0]?.toUpperCase()||``).join(``):`UX`}function oe(e){let t=new Date(e);return Number.isNaN(t.getTime())?``:new Intl.DateTimeFormat(`en-US`,{month:`short`,day:`numeric`,hour:`numeric`,minute:`2-digit`}).format(t)}function E(e){let t=Number(e)||0;return t>=1024*1024?`${(t/(1024*1024)).toFixed(1)} MB`:t>=1024?`${Math.max(t/1024,.1).toFixed(1)} KB`:`${t} B`}function D(e){return String(e?.kind||``).trim().toLowerCase()}function se(e){return D(e)===`image`}function ce(e){return D(e)===`video`}function le(e){return D(e)===`pdf`}function ue(e){let n=String(e?.id||``).trim();return n?`${t}?assetId=${encodeURIComponent(n)}`:String(e?.previewUrl||``).trim()}function de(e){let t=String(e?.fileName||``).trim(),n=t.includes(`.`)?t.split(`.`).pop():``;return String(n||D(e)||`file`).toUpperCase().slice(0,6)}function O(e=``){if(e===f.pageKey)return f.pageLabel;let t=String(e||``).trim().toLowerCase();if(!t)return`Page`;let n=Object.keys(i).find(e=>i[e]===t);return n?r[n]||`Page`:t.replaceAll(`-`,` `)}function fe(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result||``)),r.onerror=()=>n(Error(`Could not read ${e?.name||`file`}.`)),r.readAsDataURL(e)})}function pe(e,t){return{id:`pending-${crypto.randomUUID()}`,fileName:String(e?.name||`Upload`).trim()||`Upload`,contentType:String(e?.type||`application/octet-stream`).trim()||`application/octet-stream`,sizeBytes:Number(e?.size)||0,kind:String(e?.type||``).startsWith(`image/`)?`image`:String(e?.type||``).startsWith(`video/`)?`video`:String(e?.type||``).trim().toLowerCase()===`application/pdf`?`pdf`:`file`,previewUrl:String(t||``).trim(),dataBase64:String(t||``).includes(`,`)?String(t).split(`,`)[1]:``,createdAt:Date.now(),pageId:f.pageKey}}function me(e){let t=oe(e.createdAt);return e.editedAt?`${t} · edited`:t}function k(e){return e.map(e=>[e.id,e.createdAt,e.editedAt||``,e.body||``,e.author?.email||``].join(`::`)).join(`|`)}function A(e){return e.map(e=>[e.email||``,e.fullName||``,e.role||``].join(`::`)).join(`|`)}function he(e,t){if(!e||!t)return!1;let n=String(e.author?.email||``).trim().toLowerCase(),r=String(t.author?.email||``).trim().toLowerCase();if(!n||n!==r)return!1;let i=new Date(e.createdAt).getTime(),a=new Date(t.createdAt).getTime();return Number.isNaN(i)||Number.isNaN(a)?!1:i-a<=600*1e3}function ge(e){let t=e.map(e=>e?.fullName).filter(Boolean).sort((e,t)=>t.length-e.length).map(e=>e.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`));return t.length?RegExp(`@(${t.join(`|`)})`,`gi`):null}function _e(e,t=[]){let n=w(e).replace(/\n/g,`<br />`),r=ge(t);return r?n.replace(r,e=>`<span class="comments-panel__mention">${e}</span>`):n}function ve(e,t){let n=e.slice(0,t),r=n.lastIndexOf(`@`);if(r<0)return null;let i=n[r-1];if(i&&!/\s/.test(i))return null;let a=n.slice(r+1);if(a.includes(`
`)||a.includes(`@`)||/\s{2,}/.test(a))return null;let o=a.trimStart().toLowerCase(),s=f.users.filter(e=>o?[e.fullName,e.email].join(` `).toLowerCase().includes(o):!0).slice(0,6);return s.length?{start:r,end:t,suggestions:s}:null}function j(){document.body.classList.toggle(`comments-open`,f.drawerOpen),o.inert=!f.drawerOpen;let e=document.querySelector(`[data-comments-drawer-toggle]`);e&&(e.setAttribute(`aria-expanded`,f.drawerOpen?`true`:`false`),e.setAttribute(`aria-hidden`,f.drawerOpen?`true`:`false`)),I()}function M(e,t=`comments`){f.drawerOpen!==e&&(f.drawerOpen=e,f.drawerOpen?(f.shouldStickToBottom=!0,S()):y(),$(),j(),f.drawerOpen&&window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}})))}async function ye(e){let t=Array.from(e||[]).filter(Boolean);if(t.length)try{let e=await Promise.all(t.map(async e=>pe(e,await fe(e))));f.pendingAssets=[...f.pendingAssets,...e],f.error=``,Q()}catch(e){f.error=e instanceof Error?e.message:`Could not add file.`,Q()}finally{l.value=``}}function be(e){f.pendingAssets=f.pendingAssets.filter(t=>t.id!==e),Q()}async function xe(){let e=[];try{for(let n of f.pendingAssets){let r=await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`uploadAsset`,project:f.projectKey,page:f.pageKey,fileName:n.fileName,contentType:n.contentType,dataBase64:n.dataBase64})}),i=await r.json();if(!r.ok||!i?.ok||!i.asset)throw Error(i?.error||`Could not upload ${n.fileName}.`);e.push(i.asset)}}catch(t){throw await N(e),t}return e}async function N(e){await Promise.all((Array.isArray(e)?e:[]).map(async e=>{if(e?.id)try{await fetch(t,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`deleteAsset`,assetId:e.id})})}catch{}}))}async function P(e={}){let{silent:n=!1}=e;n||(f.uploadsLoading=!0,f.uploadsError=``,X());try{let e=await fetch(`${t}?project=${encodeURIComponent(f.projectKey)}`,{credentials:`include`,cache:`no-store`}),r=await e.json();if(!e.ok||!r?.ok)throw Error(r?.error||`Could not load uploads.`);f.uploads=Array.isArray(r.assets)?r.assets:[],(f.uploadsDrawerOpen||!n)&&X()}catch(e){f.uploadsError=e instanceof Error?e.message:`Could not load uploads.`,X()}finally{f.uploadsLoading=!1,n||X()}}function F(){document.body.classList.toggle(`uploads-open`,f.uploadsDrawerOpen),s.hidden=!f.uploadsDrawerOpen,s.inert=!f.uploadsDrawerOpen;let e=document.querySelector(`[data-uploads-drawer-toggle]`);e&&(e.setAttribute(`aria-expanded`,f.uploadsDrawerOpen?`true`:`false`),e.setAttribute(`aria-hidden`,f.uploadsDrawerOpen?`true`:`false`)),I()}function I(){if(!u)return;let e=window.innerWidth<=959,t=document.body.classList.contains(`customizer-open`)||document.body.classList.contains(`comments-open`)||document.body.classList.contains(`uploads-open`)||document.body.classList.contains(`vibe-open`),n=e&&t;u.hidden=!n,u.classList.toggle(`is-visible`,n)}function L(e,t=`uploads`){if(f.uploadsDrawerOpen!==e){if(f.uploadsDrawerOpen=e,F(),f.uploadsDrawerOpen){X(),P({silent:!0}),window.dispatchEvent(new CustomEvent(`uxbridge:drawer-open`,{detail:{drawer:t}}));return}X()}}function Se(e){let t=String(e||``).trim();if(!t)return null;for(let e of f.comments){let n=(Array.isArray(e.assets)?e.assets:[]).find(e=>e.id===t);if(n)return n}return f.pendingAssets.find(e=>e.id===t)||f.uploads.find(e=>e.id===t)||null}function Ce(){return f.uploads.length?f.uploads:f.comments.flatMap(e=>Array.isArray(e.assets)?e.assets:[])}function we(e){return e===`fit`?`Fit`:`${Math.round((Number(e)||1)*100)}%`}function Te(e){return e===`fit`?1:Number(e)||1}function Ee(){let e=c.querySelector(`[data-asset-viewer-scale]`),t=c.querySelector(`[data-asset-viewer-scale-trigger]`),n=c.querySelector(`[data-asset-viewer-scale-menu]`);!e||!t||!n||(e.dataset.value=f.assetViewerScaleMode,e.dataset.open=f.assetViewerScaleMenuOpen?`true`:`false`,t.setAttribute(`aria-expanded`,f.assetViewerScaleMenuOpen?`true`:`false`),n.hidden=!f.assetViewerScaleMenuOpen)}function De(e){f.assetViewerScaleMode=String(e||`fit`),f.assetViewerScaleMenuOpen=!1,Z()}function R(e){let t=f.assetViewerItems.length;t&&(f.assetViewerIndex=(e+t)%t,f.assetViewerAsset=f.assetViewerItems[f.assetViewerIndex]||null,Z())}function Oe(e){let t=typeof e==`string`?Se(e):e;if(!t)return;let n=(String(t.id||``).startsWith(`pending-`)?f.pendingAssets:Ce()).filter(Boolean),r=Math.max(n.findIndex(e=>String(e?.id||``).trim()===String(t.id||``).trim()),0);f.assetViewerItems=n,f.assetViewerIndex=r,f.assetViewerAsset=t,f.assetViewerScaleMode=`fit`,f.assetViewerScaleMenuOpen=!1,Z()}function z(){f.assetViewerAsset=null,f.assetViewerItems=[],f.assetViewerIndex=0,f.assetViewerScaleMenuOpen=!1,Z()}async function B(t={}){let{silent:n=!1}=t,r=++f.commentsRequestToken,i=f.comments.map(e=>e.id).join(`|`),a=k(f.comments),o=A(f.users),s=f.unseenCount,c=f.error;n||(f.isLoading=!0,f.error=``,Q());try{let t=await fetch(`${e}?project=${encodeURIComponent(f.projectKey)}&page=${encodeURIComponent(f.pageKey)}`,{credentials:`include`,cache:`no-store`}),l=await t.json();if(r!==f.commentsRequestToken)return;if(!t.ok||!l?.ok)throw Error(l?.error||`Could not load comments.`);f.comments=Array.isArray(l.comments)?l.comments:[],f.users=Array.isArray(l.users)?l.users:[],f.canDeleteAnyComment=!!l.canDeleteAnyComment;let u=g(),d=Number(l.lastSeenAt)||0,p=String(l.lastSeenCommentId||``);if(f.lastPersistedSeenCommentId=p,f.lastPersistedSeenAt=d,f.lastSeenAt=Math.max(d,u.lastSeenAt||0),f.lastSeenCommentId=f.lastSeenAt===d&&p?p:u.lastSeenCommentId,Re(i,f.comments)&&(f.shouldStickToBottom=!0),f.currentPageActivityAt=b(f.comments),f.drawerOpen)await S();else{let e=f.pageCommentSummary.get(f.pageKey);e?f.unseenCount=Number(e.unreadCount||0):y()}$(),C();let m=k(f.comments),h=A(f.users);n&&(m!==a||h!==o||f.unseenCount!==s||f.error!==c)&&Q()}catch(e){if(r!==f.commentsRequestToken)return;f.error=e instanceof Error?e.message:`Could not load comments.`,n&&f.error!==c&&Q()}finally{if(r!==f.commentsRequestToken)return;n||(f.isLoading=!1,Q())}}async function V(){let t=++f.summaryRequestToken,n=ne();if(!(!f.projectKey||!n.length))try{let r=await fetch(`${e}?project=${encodeURIComponent(f.projectKey)}&summary=pages&pages=${encodeURIComponent(n.join(`,`))}`,{credentials:`include`,cache:`no-store`}),i=await r.json().catch(()=>({}));if(t!==f.summaryRequestToken)return!1;if(!r.ok||!i?.ok)throw Error(i?.error||`Could not load comment summary.`);let a=f.currentPageActivityAt,o=f.unseenCount;f.pageCommentSummary=new Map((Array.isArray(i.summary)?i.summary:[]).map(e=>[e.page,(()=>{let t=Array.isArray(e.commentIds)?e.commentIds:[],n=Array.isArray(e.mentionCommentIds)?e.mentionCommentIds:[],r=g(e.page),i=String(e.lastSeenCommentId||``),a=Number(e.lastSeenAt)||0,o=i||r.lastSeenCommentId,s=e=>{if(!Array.isArray(e)||!e.length)return 0;if(!o)return e.length;let t=e.findIndex(e=>e===o);return t<0?e.length:Math.max(e.length-(t+1),0)};return{commentIds:t,latestActivityAt:String(e.latestActivityAt||``),unreadCount:a>0?Number(e.unreadCount||0):s(t),unreadMentionCount:a>0?Number(e.unreadMentionCount||0):s(n),lastSeenCommentId:o,lastSeenAt:Math.max(a,r.lastSeenAt||0)}})()])),x();let s=f.pageCommentSummary.get(f.pageKey);return!f.drawerOpen&&s&&(f.unseenCount=Number(s.unreadCount||0)),f.unseenCount!==o&&$(),C(),a!==f.currentPageActivityAt}catch{return t===f.summaryRequestToken?($(),C(),!1):!1}}function ke(){f.refreshTimer&&window.clearTimeout(f.refreshTimer);let e=()=>{f.refreshTimer=window.setTimeout(()=>{if(!f.projectKey||!f.pageKey||f.isSubmitting||document.visibilityState!==`visible`){e();return}if(f.drawerOpen){B({silent:!0}).finally(e),V();return}V().then(e=>e?B({silent:!0}):null).finally(e)},te())};e()}function Ae(){f.refreshTimer&&=(window.clearTimeout(f.refreshTimer),null)}function H(){if(!(!f.projectKey||!f.pageKey||document.visibilityState!==`visible`)){if(f.uploadsDrawerOpen&&P({silent:!0}),f.drawerOpen){V().then(e=>{e&&B({silent:!0})});return}V().then(e=>{e&&B({silent:!0})})}}async function U(){if(!(!f.body.trim()&&!f.pendingAssets.length||f.isSubmitting)){f.isSubmitting=!0,f.error=``,Q();try{let t=f.pendingAssets.length?await xe():[],n=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({project:f.projectKey,page:f.pageKey,body:f.body,assets:t})}),r=await n.json();if(!n.ok||!r?.ok)throw await N(t),Error(r?.error||`Could not post comment.`);f.comments=Array.isArray(r.comments)?r.comments:f.comments,f.canDeleteAnyComment=!!r.canDeleteAnyComment,f.users=Array.isArray(r.users)?r.users:f.users,f.canDeleteAnyComment=!!r.canDeleteAnyComment,f.shouldStickToBottom=!0,f.body=``,f.pendingAssets=[],f.mention=null,f.mentionIndex=0,f.pageCommentSummary.set(f.pageKey,{commentIds:f.comments.map(e=>e.id),latestActivityAt:b(f.comments),unreadCount:0,unreadMentionCount:0,lastSeenCommentId:f.comments.at(-1)?.id||``,lastSeenAt:_(f.comments.at(-1))}),x(),f.lastSeenCommentId=f.comments.at(-1)?.id||``,f.lastSeenAt=_(f.comments.at(-1)),$(),C(),P({silent:!0})}catch(e){f.error=e instanceof Error?e.message:`Could not post comment.`}finally{f.isSubmitting=!1,Q()}}}function je(e){f.editingCommentId=e.id,f.editingCommentBody=e.body,f.copiedCommentId=``,Q()}function W(){f.editingCommentId=``,f.editingCommentBody=``,f.busyCommentId=``,Q()}async function G(t){let n=f.editingCommentBody.trim();if(!(!n||f.busyCommentId)){f.busyCommentId=t,Q();try{let r=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`edit`,project:f.projectKey,page:f.pageKey,commentId:t,body:n})}),i=await r.json();if(!r.ok||!i?.ok)throw Error(i?.error||`Could not save comment.`);f.comments=Array.isArray(i.comments)?i.comments:f.comments,f.canDeleteAnyComment=!!i.canDeleteAnyComment,f.users=Array.isArray(i.users)?i.users:f.users,f.shouldStickToBottom=!0,f.editingCommentId=``,f.editingCommentBody=``,f.busyCommentId=``,f.pageCommentSummary.set(f.pageKey,{commentIds:f.comments.map(e=>e.id),latestActivityAt:b(f.comments),unreadCount:f.drawerOpen?0:v(f.comments,f.lastSeenAt,!1),unreadMentionCount:0,lastSeenCommentId:f.lastSeenCommentId,lastSeenAt:f.lastSeenAt}),x(),C(),Q()}catch(e){f.error=e instanceof Error?e.message:`Could not save comment.`,f.busyCommentId=``,Q()}}}async function Me(t){if(!f.busyCommentId&&window.confirm(`Delete this comment?`)){f.busyCommentId=t,Q();try{let n=await fetch(e,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`delete`,project:f.projectKey,page:f.pageKey,commentId:t})}),r=await n.json();if(!n.ok||!r?.ok)throw Error(r?.error||`Could not delete comment.`);f.comments=Array.isArray(r.comments)?r.comments:f.comments,f.users=Array.isArray(r.users)?r.users:f.users,f.shouldStickToBottom=!0,f.editingCommentId=f.editingCommentId===t?``:f.editingCommentId,f.editingCommentBody=f.editingCommentId?f.editingCommentBody:``,f.pageCommentSummary.set(f.pageKey,{commentIds:f.comments.map(e=>e.id),latestActivityAt:b(f.comments),unreadCount:f.drawerOpen?0:v(f.comments,f.lastSeenAt,!1),unreadMentionCount:0,lastSeenCommentId:f.lastSeenCommentId,lastSeenAt:f.lastSeenAt}),x(),f.drawerOpen?await S():y(),$(),C(),f.busyCommentId=``,Q()}catch(e){f.error=e instanceof Error?e.message:`Could not delete comment.`,f.busyCommentId=``,Q()}}}async function Ne(e){try{await navigator.clipboard.writeText(e.body),f.copiedCommentId=e.id,Q(),window.setTimeout(()=>{f.copiedCommentId===e.id&&(f.copiedCommentId=``,Q())},1200)}catch{f.error=`Could not copy comment.`,Q()}}function K(e){if(!o.querySelector(`[data-comments-input]`)||!f.mention)return;let t=`@${e.fullName} `,n=f.body.slice(0,f.mention.start)+t+f.body.slice(f.mention.end),r=f.mention.start+t.length;f.body=n,f.mention=null,f.mentionIndex=0,Q();let i=o.querySelector(`[data-comments-input]`);i&&(i.focus(),i.setSelectionRange(r,r))}function q(){let e=o.querySelector(`[data-comments-input]`);e&&(f.body=e.value,f.mention=ve(e.value,e.selectionStart||0),f.mentionIndex=0,Q())}function J(e){e&&(e.style.height=`auto`,e.style.height=`${Math.max(e.scrollHeight,96)}px`)}function Pe(e,t={}){let{compact:n=!1}=t,r=ue(e),i=w(e.fileName||`Attachment`);if(se(e)&&r)return`<img src="${T(r)}" alt="${i}" loading="lazy" />`;if(ce(e)&&r)return`<video src="${T(r)}" muted playsinline preload="metadata"></video>`;let a=le(e)?`PDF`:de(e);return`<span class="comments-panel__asset-glyph${n?` is-compact`:``}">${w(a)}</span>`}function Y(e,t={}){let{pending:n=!1,compact:r=!1,context:i=`comment`}=t,a=String(e.id||``).trim(),o=w(e.fileName||`Attachment`),s=w(O(e.pageId));return`
      <button
        type="button"
        class="comments-panel__asset-card${r?` is-compact`:``}${n?` is-pending`:``}"
        data-asset-open="${a}"
        data-asset-context="${T(i)}"
      >
        <span class="comments-panel__asset-preview">
          ${Pe(e,{compact:r})}
        </span>
        <span class="comments-panel__asset-copy">
          <strong>${o}</strong>
          <small>${w(`${s} · ${E(e.sizeBytes)}`)}</small>
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
    `}function Fe(){return f.pendingAssets.length?`
      <div class="comments-panel__pending-assets">
        ${f.pendingAssets.map(e=>Y(e,{pending:!0,compact:!0,context:`pending`})).join(``)}
      </div>
    `:``}function Ie(e=[]){return!Array.isArray(e)||!e.length?``:`
      <div class="comments-panel__assets">
        ${e.map(e=>Y(e,{compact:!0,context:`comment`})).join(``)}
      </div>
    `}function Le(){if(f.isLoading)return`<div class="comments-panel__empty">Loading comments…</div>`;if(f.error&&!f.comments.length)return`<div class="comments-panel__empty comments-panel__empty--error">${w(f.error)}</div>`;if(!f.comments.length)return`<div class="comments-panel__empty">No comments yet. Start the conversation for this page.</div>`;let e=m();return f.comments.map((t,n)=>`
          ${(()=>{let r=String(t.author?.email||``).toLowerCase()===e,i=r,a=r||f.canDeleteAnyComment,o=f.editingCommentId===t.id,s=f.busyCommentId===t.id,c=f.copiedCommentId===t.id,l=f.comments[n-1],u=he(t,l),d=`
              <div class="comments-panel__actions" role="menu" aria-label="Comment actions">
                <button type="button" class="comments-panel__action" data-comment-action="copy" data-comment-id="${t.id}" aria-label="${c?`Copied`:`Copy comment`}" title="${c?`Copied`:`Copy`}">
                  ${c?`
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
                ${i?`
                        <button type="button" class="comments-panel__action" data-comment-action="edit" data-comment-id="${t.id}" aria-label="Edit comment" title="Edit">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"></path>
                            <path d="M13.5 6.5 17.5 10.5"></path>
                          </svg>
                        </button>
                      `:``}
                ${a?`
                        <button type="button" class="comments-panel__action comments-panel__action--destructive" data-comment-action="delete" data-comment-id="${t.id}" aria-label="Delete comment" title="Delete" ${s?`disabled`:``}>
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
              <article class="comments-panel__item${r?` is-own`:``}${u?` is-grouped`:``}" data-comment-id="${t.id}">
                <div class="comments-panel__message-wrap">
                  ${d}
                  ${u?``:`
                        <div class="comments-panel__meta-line">
                          <strong>${w(t.author?.fullName||`Unknown user`)}</strong>
                          <span>${w(me(t))}</span>
                        </div>
                      `}
                  <div class="comments-panel__bubble">
                    ${o?`
                          <div class="comments-panel__edit">
                            <textarea data-comment-edit-input="${t.id}">${w(f.editingCommentBody)}</textarea>
                            <div class="comments-panel__edit-actions">
                              <button type="button" class="comments-panel__edit-button comments-panel__edit-button--secondary" data-comment-action="cancel-edit" data-comment-id="${t.id}" ${s?`disabled`:``}>Cancel</button>
                              <button type="button" class="comments-panel__edit-button" data-comment-action="save-edit" data-comment-id="${t.id}" ${s?`disabled`:``}>
                                ${s?`Saving…`:`Save`}
                              </button>
                            </div>
                          </div>
                        `:`
                            ${t.body?`<div class="comments-panel__body">${_e(t.body,t.mentions||[])}</div>`:``}
                            ${Ie(t.assets||[])}
                          `}
                  </div>
                </div>
              </article>
            `})()}
        `).join(``)}function Re(e,t){return t.map(e=>e.id).join(`|`)!==e}function ze(e){return e?e.scrollHeight-e.scrollTop-e.clientHeight<=32:!0}function Be(e){e&&(e.scrollTop=e.scrollHeight)}function Ve(){return f.mention?.suggestions?.length?`
      <div class="comments-panel__mentions" data-comments-mentions>
        ${f.mention.suggestions.map((e,t)=>`
              <button
                type="button"
                class="comments-panel__mention-option ${t===f.mentionIndex?`is-active`:``}"
                data-mention-index="${t}"
              >
                <span class="comments-panel__mention-avatar" style="--avatar-bg:${w(e.avatarColor||``)}">${w(ae(e.fullName))}</span>
                <span class="comments-panel__mention-copy">
                  <strong>${w(e.fullName)}</strong>
                  <small>${w(e.email)}</small>
                </span>
              </button>
            `).join(``)}
      </div>
    `:``}function He(){let e=!!(f.body.trim()||f.pendingAssets.length)&&!f.isSubmitting;return`
      <div class="comments-panel__composer">
        ${Fe()}
        <div class="comments-panel__field">
          <div class="comments-panel__input-wrap">
            <textarea
              data-comments-input
              placeholder="Type a message"
            >${w(f.body)}</textarea>
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
        ${Ve()}
        ${f.error?`<p class="comments-panel__status comments-panel__status--error">${w(f.error)}</p>`:``}
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
            <p>Browse uploaded files for ${w(f.pageLabel)} and the rest of this project.</p>
          </div>
          <button class="uploads-panel__close" type="button" data-uploads-close aria-label="Close uploads">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div class="uploads-panel__list" data-uploads-list>
          ${f.uploadsLoading?`<div class="uploads-panel__empty">Loading uploads…</div>`:f.uploadsError?`<div class="uploads-panel__empty uploads-panel__empty--error">${w(f.uploadsError)}</div>`:f.uploads.length?f.uploads.map(e=>`
                      <div class="uploads-panel__item">
                        ${Y(e,{context:`uploads`})}
                      </div>
                    `).join(``):`<div class="uploads-panel__empty">No uploads yet. Add attachments from the comments drawer.</div>`}
        </div>
      </div>
    `,s.querySelector(`[data-uploads-close]`)?.addEventListener(`click`,()=>{L(!1)}),s.querySelectorAll(`[data-asset-open]`).forEach(e=>{e.addEventListener(`click`,()=>{Oe(e.getAttribute(`data-asset-open`))})}),F()}function Z(){let e=f.assetViewerAsset;if(!e){c.hidden=!0,c.innerHTML=``,document.body.classList.remove(`asset-viewer-open`);return}let t=ue(e),n=w(e.fileName||`Attachment`),r=w(`${w(O(e.pageId))} · ${E(e.sizeBytes)}`),i=f.assetViewerItems.length>1,a=Te(f.assetViewerScaleMode),o=`
      <div class="asset-viewer__empty">
        <strong>${n}</strong>
        <p>Preview is not available for this file type.</p>
      </div>
    `;se(e)&&t?o=`<img class="asset-viewer__image" src="${T(t)}" alt="${n}" />`:ce(e)&&t?o=`<video class="asset-viewer__video" src="${T(t)}" controls playsinline></video>`:le(e)&&t&&(o=`<iframe class="asset-viewer__pdf" src="${T(t)}" title="${n}"></iframe>`),c.hidden=!1,document.body.classList.add(`asset-viewer-open`),c.innerHTML=`
      <div class="asset-viewer__backdrop" data-asset-viewer-close></div>
      <div class="asset-viewer__surface" role="dialog" aria-modal="true" aria-label="${n}">
        <div class="asset-viewer__topbar">
          <div class="asset-viewer__copy">
            <h3>${n}</h3>
            <p>${r}</p>
          </div>
          <div class="asset-viewer__center">
            <div class="asset-viewer__scale-wrap">
              <div class="preview-scale-select asset-viewer__scale" data-asset-viewer-scale data-value="${T(f.assetViewerScaleMode)}" data-open="${f.assetViewerScaleMenuOpen?`true`:`false`}">
                <button
                  type="button"
                  class="preview-scale-trigger"
                  data-asset-viewer-scale-trigger
                  aria-haspopup="menu"
                  aria-expanded="${f.assetViewerScaleMenuOpen?`true`:`false`}"
                  aria-label="Scale asset"
                >
                  <span class="preview-scale-trigger__icon" aria-hidden="true"></span>
                  <span class="preview-scale-select__label">${w(we(f.assetViewerScaleMode))}</span>
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
                      href="${T(`${t}${t.includes(`?`)?`&`:`?`}download=1`)}"
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
    `,c.querySelectorAll(`[data-asset-viewer-close]`).forEach(e=>{e.addEventListener(`click`,z)}),c.querySelector(`[data-asset-viewer-prev]`)?.addEventListener(`click`,()=>{R(f.assetViewerIndex-1)}),c.querySelector(`[data-asset-viewer-next]`)?.addEventListener(`click`,()=>{R(f.assetViewerIndex+1)}),c.querySelector(`[data-asset-viewer-scale-trigger]`)?.addEventListener(`click`,()=>{f.assetViewerScaleMenuOpen=!f.assetViewerScaleMenuOpen,Ee()}),c.querySelectorAll(`[data-asset-viewer-scale-option]`).forEach(e=>{e.addEventListener(`click`,()=>{De(e.getAttribute(`data-asset-viewer-scale-option`))})}),c.onclick=e=>{let t=c.querySelector(`[data-asset-viewer-scale]`),n=c.querySelector(`.asset-viewer__backdrop`);c.querySelector(`.asset-viewer__viewport`),c.querySelector(`.asset-viewer__canvas`),f.assetViewerScaleMenuOpen&&t&&!t.contains(e.target)&&(f.assetViewerScaleMenuOpen=!1,Ee()),!(e.target.closest(`.asset-viewer__copy`)||e.target.closest(`.asset-viewer__actions`)||e.target.closest(`.asset-viewer__center`)||e.target.closest(`.asset-viewer__image`)||e.target.closest(`.asset-viewer__video`)||e.target.closest(`.asset-viewer__pdf`)||e.target.closest(`.asset-viewer__empty`))&&e.target===n&&z()}}function Q(){let e=document.activeElement,t=o.querySelector(`[data-comments-thread]`),n=f.shouldStickToBottom||ze(t),r=!n&&t?t.scrollTop:null,i=e?.matches?.(`[data-comments-input]`),a=i?e.selectionStart:null,s=i?e.selectionEnd:null,c=e?.getAttribute?.(`data-comment-edit-input`),u=!!c,d=u?e.selectionStart:null,p=u?e.selectionEnd:null;o.innerHTML=`
      <div class="comments-panel__inner">
        <div class="comments-panel__header">
          <div class="comments-panel__header-copy">
            <p class="comments-panel__eyebrow">Comments</p>
            <h2>Page Discussion</h2>
            <p>Collaborate on ${w(f.pageLabel)} and tag teammates with @mentions.</p>
          </div>
          <button class="comments-panel__close" type="button" data-comments-close aria-label="Close comments">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
        <div class="comments-panel__thread" data-comments-thread>
          ${Le()}
        </div>
        ${He()}
      </div>
    `;let m=o.querySelector(`[data-comments-input]`),h=o.querySelector(`[data-comments-thread]`);if(h?.addEventListener(`scroll`,()=>{f.shouldStickToBottom=ze(h)}),J(m),m?.addEventListener(`input`,()=>{J(m),q()}),m?.addEventListener(`click`,q),m?.addEventListener(`keyup`,q),m?.addEventListener(`keydown`,e=>{if(!f.mention?.suggestions?.length){e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),U());return}if(e.key===`ArrowDown`){e.preventDefault(),f.mentionIndex=(f.mentionIndex+1)%f.mention.suggestions.length,Q(),o.querySelector(`[data-comments-input]`)?.focus();return}if(e.key===`ArrowUp`){e.preventDefault(),f.mentionIndex=(f.mentionIndex-1+f.mention.suggestions.length)%f.mention.suggestions.length,Q(),o.querySelector(`[data-comments-input]`)?.focus();return}if(e.key===`Enter`&&f.mention){e.preventDefault(),K(f.mention.suggestions[f.mentionIndex]);return}e.key===`Escape`&&(f.mention=null,f.mentionIndex=0,Q())}),o.querySelector(`[data-comments-close]`)?.addEventListener(`click`,()=>{M(!1)}),o.querySelector(`[data-comments-submit]`)?.addEventListener(`click`,()=>{U()}),o.querySelector(`[data-comments-attach]`)?.addEventListener(`click`,()=>{l.click()}),o.querySelectorAll(`[data-comment-action]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.getAttribute(`data-comment-action`),n=e.getAttribute(`data-comment-id`),r=f.comments.find(e=>e.id===n);if(!(!t||!n||!r)){if(t===`copy`){Ne(r);return}if(t===`edit`){je(r);return}if(t===`cancel-edit`){W();return}if(t===`save-edit`){G(n);return}t===`delete`&&Me(n)}})}),o.querySelectorAll(`[data-comment-edit-input]`).forEach(e=>{e.addEventListener(`input`,()=>{f.editingCommentBody=e.value}),e.addEventListener(`keydown`,t=>{if(t.key===`Escape`){t.preventDefault(),W();return}t.key===`Enter`&&(t.metaKey||t.ctrlKey)&&(t.preventDefault(),G(e.getAttribute(`data-comment-edit-input`)))})}),o.querySelectorAll(`[data-mention-index]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=f.mention?.suggestions?.[Number(e.dataset.mentionIndex)];t&&K(t)})}),o.querySelectorAll(`[data-pending-asset-remove]`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault(),t.stopPropagation(),be(e.getAttribute(`data-pending-asset-remove`))})}),o.querySelectorAll(`[data-asset-open]`).forEach(e=>{e.addEventListener(`click`,()=>{Oe(e.getAttribute(`data-asset-open`))})}),i){let e=o.querySelector(`[data-comments-input]`);e&&(e.focus(),J(e),e.setSelectionRange(a??f.body.length,s??f.body.length))}if(n?(requestAnimationFrame(()=>{Be(h)}),f.shouldStickToBottom=!0):h&&r!==null&&requestAnimationFrame(()=>{h.scrollTop=r}),u&&c){let e=o.querySelector(`[data-comment-edit-input="${c}"]`);e&&(e.focus(),e.setSelectionRange(d??f.editingCommentBody.length,p??f.editingCommentBody.length))}}function $(){let e=document.querySelector(`[data-comments-drawer-toggle]`);if(!e)return;let t=e.querySelector(`[data-comments-badge]`);if(t){if(!f.unseenCount||f.drawerOpen){t.hidden=!0,t.textContent=``;return}t.hidden=!1,t.textContent=String(f.unseenCount>99?`99+`:f.unseenCount)}}function Ue(){let e=window.UXBridgeActionRail?.renderButtonContent||(({icon:e,label:t,tooltipClass:n=``,trailingMarkup:r=``}={})=>`
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
        `),t=document.querySelector(`[data-side-actions]`),n=document.createElement(`button`);n.type=`button`,n.className=`bridge-action-rail-button comments-drawer-toggle`,n.setAttribute(`data-comments-drawer-toggle`,``),n.setAttribute(`aria-expanded`,`false`),n.setAttribute(`aria-label`,`Comments`),n.innerHTML=e({icon:`comments`,label:`Comments`,tooltipClass:`comments-drawer-toggle__tooltip`,trailingMarkup:`<span class="comments-drawer-toggle__badge" data-comments-badge hidden></span>`}),n.addEventListener(`click`,()=>{M(!f.drawerOpen)});let r=document.createElement(`button`);r.type=`button`,r.className=`bridge-action-rail-button uploads-drawer-toggle`,r.setAttribute(`data-uploads-drawer-toggle`,``),r.setAttribute(`aria-expanded`,`false`),r.setAttribute(`aria-label`,`Uploads`),r.innerHTML=e({icon:`files`,label:`Files`,tooltipClass:`uploads-drawer-toggle__tooltip`}),r.addEventListener(`click`,()=>{L(!f.uploadsDrawerOpen)}),window.addEventListener(`uxbridge:drawer-open`,e=>{e.detail?.drawer!==`comments`&&M(!1,`comments`),e.detail?.drawer!==`uploads`&&L(!1,`uploads`)}),t?(t.append(n),t.append(r)):(document.body.append(n),document.body.append(r)),j(),F(),$(),X()}async function We(){let e=d?50:1;for(let t=0;t<e;t+=1){let e=ie();if(e.pageKey){f.projectKey=e.projectKey,f.pageKey=e.pageKey,f.pageLabel=e.pageLabel,Ue(),Q(),await B(),await V(),await P({silent:!0}),ke();return}await new Promise(e=>window.setTimeout(e,100))}}We(),l.addEventListener(`change`,()=>{ye(l.files)}),window.addEventListener(`beforeunload`,()=>{Ae()}),window.addEventListener(`uxbridge:project-nav-rendered`,()=>{C(),V()}),u?.addEventListener(`click`,()=>{f.drawerOpen&&M(!1),f.uploadsDrawerOpen&&L(!1)}),window.addEventListener(`resize`,I),document.addEventListener(`visibilitychange`,H),window.addEventListener(`pageshow`,H),window.addEventListener(`focus`,H),document.addEventListener(`keydown`,e=>{if(e.key===`Escape`&&f.assetViewerAsset){z();return}if(f.assetViewerAsset&&f.assetViewerItems.length>1){if(e.key===`ArrowLeft`){e.preventDefault(),R(f.assetViewerIndex-1);return}e.key===`ArrowRight`&&(e.preventDefault(),R(f.assetViewerIndex+1))}})})();