module.exports =
  (...permissions) =>
    (req, res, next) => {

      const userPermissions =
        req.user.permisos || [];

      const hasPermission =
        permissions.some(permission =>
          userPermissions.includes(permission)
        );

      if (!hasPermission) {
        return res.status(403).json({
          message:
            "No tienes permisos"
        });
      }

      next();
    };