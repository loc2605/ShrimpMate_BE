const { NestFactory } = require('@nestjs/core');
const { DataSource } = require('typeorm');
const { AppModule } = require('./dist/app.module');
const bcrypt = require('bcrypt');

async function check() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const ds = app.get(DataSource);
  const users = await ds.query(`SELECT id, email, phone_number, password_hash, "isActive", role FROM users WHERE email = 'farmer@shrimpmate.local'`);
  console.log('User found:', JSON.stringify(users, null, 2));
  if (users.length > 0) {
    console.log('Matches Farmer@123456:', await bcrypt.compare('Farmer@123456', users[0].password_hash));
    console.log('Matches Manager@123456:', await bcrypt.compare('Manager@123456', users[0].password_hash));
    console.log('Matches Admin@123456:', await bcrypt.compare('Admin@123456', users[0].password_hash));
  }
  await app.close();
}

check().catch(console.error);
