import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import pool from '../db';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';

const pgSession = ConnectPgSimple(session);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || (process.env.NODE_ENV === 'production' && sessionSecret.length < 32)) {
  console.error('FATAL: SESSION_SECRET is missing or too weak (minimum 32 characters for production).');
  process.exit(1);
}

const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    createTableIfMissing: true,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
});

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const res = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (res.rows.length === 0) return done(null, false, { message: 'Incorrect email.' });
    
    const admin = res.rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return done(null, false, { message: 'Incorrect password.' });
    
    return done(null, admin);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const res = await pool.query('SELECT id, email FROM admins WHERE id = $1', [id]);
    if (res.rows.length === 0) return done(new Error("Admin not found"));
    done(null, res.rows[0]);
  } catch (err) {
    done(err);
  }
});

export default [
  sessionMiddleware,
  passport.initialize(),
  passport.session()
];
