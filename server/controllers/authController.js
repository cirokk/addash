const { supabase } = require('../supabase');
const { hashPassword, sanitizeUser, verifyPassword, validatePasswordStrength } = require('../auth');
const { getClientIp } = require('../middleware');
const { getClientPreference } = require('../clientPreferences');

async function findUserByUsername(username) {
  const { data, error } = await supabase
    .from('traffic_users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const ip = getClientIp(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Falha na autenticação' });
    }

    const passwordCheck = await verifyPassword(password, user.password);
    if (!passwordCheck.ok) {
      return res.status(401).json({ error: 'Falha na autenticação' });
    }

    if (passwordCheck.needsUpgrade) {
      const upgradedHash = await hashPassword(password);
      await supabase.from('traffic_users').update({ password: upgradedHash }).eq('id', user.id);
      user.password = upgradedHash;
    }

    await supabase.from('traffic_access_log').insert({
      user_id: user.id,
      username: user.username,
      role: user.role,
      ip_address: ip,
      user_agent: userAgent,
    });

    req.session.user = sanitizeUser(user);
    if (req.session.user?.role === 'client' && req.session.user?.client_id) {
      req.session.user.preferences = getClientPreference(req.session.user.client_id);
    }

    req.session.save((saveError) => {
      if (saveError) {
        console.error('Erro ao persistir sessão:', saveError);
        return res.status(500).json({ error: 'Erro interno ao persistir sessão' });
      }

      return res.json({
        user: req.session.user,
      });
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno ao autenticar' });
  }
};

exports.me = async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
  return res.json({ user: req.session.user });
};

exports.logout = async (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Erro ao encerrar sessão:', error);
      return res.status(500).json({ error: 'Erro ao encerrar sessão' });
    }
    res.clearCookie('trafficdash.sid');
    return res.json({ success: true });
  });
};

exports.changeOwnPassword = async (req, res) => {
  try {
    const authUser = req.user;
    const { currentPassword, newPassword } = req.body || {};

    if (!authUser?.id) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    const passwordValidationError = validatePasswordStrength(newPassword);
    if (passwordValidationError) {
      return res.status(400).json({ error: passwordValidationError });
    }

    const { data: user, error: findErr } = await supabase
      .from('traffic_users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (findErr || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const passwordCheck = await verifyPassword(currentPassword, user.password);
    if (!passwordCheck.ok) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const newHash = await hashPassword(newPassword);
    const { error } = await supabase
      .from('traffic_users')
      .update({ password: newHash })
      .eq('id', authUser.id);

    if (error) {
      return res.status(500).json({ error: 'Erro ao alterar senha' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao trocar senha:', error);
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};
