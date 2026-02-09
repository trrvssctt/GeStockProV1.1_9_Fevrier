
export const tenantIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Auth context missing' });
  }

  const tenantId = req.user.tenantId;

  if (req.user.role === 'SUPER_ADMIN') {
    const targetTenant = req.headers['x-tenant-id'] || tenantId;
    req.tenantFilter = { tenantId: targetTenant };
  } else {
    if (!tenantId) {
      return res.status(403).json({ error: 'Missing Tenant Identity' });
    }
    req.tenantFilter = { tenantId };
  }

  next();
};
