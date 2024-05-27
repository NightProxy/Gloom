const { createGloomServer } = require('./src/server');

const PORT = 3000;
const app = createGloomServer();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});