const app = require('./app');
const { initAuth } = require('./auth/authService');
const PORT = process.env.PORT || 3001;

initAuth()
  .catch((e) => {
    console.error('Auth init failed:', e);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
