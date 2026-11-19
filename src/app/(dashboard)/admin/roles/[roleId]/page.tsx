import AuthGuard from "@/components/auth/AuthGuard";
import RoleDetail from "@/components/iam/RoleDetail";
import { PERMISSIONS } from "@/lib/iam/permission-codes";

export default async function Page({ params }: PageProps<"/admin/roles/[roleId]">) {
  const { roleId } = await params;

  return (
    <AuthGuard requiredPermissions={[PERMISSIONS.ROLE_READ]}>
      <RoleDetail roleId={roleId} />
    </AuthGuard>
  );
}