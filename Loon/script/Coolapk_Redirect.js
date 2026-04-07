let url = $request.url;

if (url.indexOf("coolapk.com/link") !== -1) {
  let match = url.match(/url=([^&]+)/);
  if (match) {
    let realUrl = decodeURIComponent(match[1]);

    let html = `
        <html>
        <head>
            <meta http-equiv="refresh" content="0;url=${realUrl}">
        </head>
        <body>
            <script>
                window.location.href = "${realUrl}";
            </script>
        </body>
        </html>
        `;

    $done({
      response: {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        },
        body: html
      }
    });
    return;
  }
}

$done({});