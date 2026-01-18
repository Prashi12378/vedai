export default {
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('❌ Proxy Error:', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('➡️ Proxy Request:', req.method, req.url);
                    });
                    proxy.on('proxyRes', (proxyRes, req, _res) => {
                        console.log('⬅️ Proxy Response:', proxyRes.statusCode, req.url);
                    });
                },
            }
        }
    }
}
