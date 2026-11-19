import AuthGuard from "@/components/auth/AuthGuard";
import RolesPage from "@/components/iam/RolesPage";
import { PERMISSIONS } from "@/lib/iam/permission-codes";

export default function Page() {
  return (
    <AuthGuard requiredPermissions={[PERMISSIONS.ROLE_READ]}>
      <RolesPage />
    </AuthGuard>
  );
}