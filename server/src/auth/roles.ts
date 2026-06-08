export type Role = 'admin' | 'meta_partner' | 'partner' | 'tenant';

const ROLE_LEVEL: Record<Role, number> = {
  admin: 100,
  meta_partner: 75,
  partner: 50,
  tenant: 25,
};

export function canAccess(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

export function requireRole(requiredRole: Role) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !canAccess(req.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
