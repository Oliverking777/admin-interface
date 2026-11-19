import AuthGuard from "@/components/auth/AuthGuard";
import PermissionsPage from "@/components/iam/PermissionsPage";
import { PERMISSIONS } from "@/lib/iam/permission-codes";

export default function Page() {
  return (
    <AuthGuard requiredPermissions={[PERMISSIONS.PERMISSION_READ]}>
      <PermissionsPage />
    </AuthGuard>
  );
}