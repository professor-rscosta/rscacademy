const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');

const SALT_ROUNDS = 12;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const { senha_hash, ...safe } = user;
  return safe;
}

async function login(email, senha) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    const err = new Error('E-mail ou senha incorretos.');
    err.status = 401;
    throw err;
  }
  const senhaCorreta = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaCorreta) {
    const err = new Error('E-mail ou senha incorretos.');
    err.status = 401;
    throw err;
  }
  if (user.status === 'pendente') {
    const err = new Error('Sua conta ainda não foi aprovada pelo administrador.');
    err.status = 403;
    throw err;
  }
  if (user.status === 'inativo') {
    const err = new Error('Sua conta está inativa. Entre em contato com o administrador.');
    err.status = 403;
    throw err;
  }
  const token = generateToken(user);
  return { token, user: sanitizeUser(user) };
}

async function register({ nome, email, senha, perfil }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    const err = new Error('E-mail já cadastrado.');
    err.status = 409;
    throw err;
  }
  const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);
  const user = await userRepository.create({ nome, email, senha_hash, perfil, status: 'pendente' });
  return {
    message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
    user: sanitizeUser(user),
  };
}

module.exports = { login, register };
