"""
admin_panel/views.py
Port of admin.controller.js.
Handles: platform stats, domain stats, user list/role/delete, institution CRUD.
"""
import logging
from django.db.models import Count

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.serializers import UserSerializer
from apps.institutions.models import Institution
from apps.sessions.models import InterviewSession
from interviewai.permissions import IsAdmin

logger = logging.getLogger(__name__)

VALID_ROLES    = ["student", "professional", "admin", "institution_admin", "guest"]
VALID_STATUSES = ["ACTIVE", "REJECTED", "PENDING"]


def _institution_dict(i: Institution) -> dict:
    return {
        "id":                   i.id,
        "name":                 i.name,
        "allowedDomains":       i.allowed_domains,
        "perStudentPrice":      i.per_student_price,
        "studentLimit":         i.student_limit,
        "studentsRegistered":   i.students_registered,
        "approvalStatus":       i.approval_status,
        "subscriptionValidTill": i.subscription_valid_till,
        "createdAt":            i.created_at,
        "updatedAt":            i.updated_at,
    }


class StatsView(APIView):
    """GET /api/admin/stats — port of getPlatformStats()"""
    permission_classes = [IsAdmin]

    def get(self, request):
        total_users      = User.objects.count()
        total_interviews = InterviewSession.objects.count()
        completed_count  = InterviewSession.objects.filter(completed=True).count()

        scores = [
            s.final_report.get("scores", {}).get("overall")
            for s in InterviewSession.objects.filter(completed=True).only("final_report")
            if isinstance((s.final_report or {}).get("scores", {}).get("overall"), (int, float))
        ]
        avg_score = f"{(sum(scores) / len(scores)):.2f}" if scores else "0.00"

        return Response({
            "users":               total_users,
            "interviews":          total_interviews,
            "completedInterviews": completed_count,
            "averageScore":        avg_score,
        })


class DomainStatsView(APIView):
    """GET /api/admin/domain-stats — port of getDomainWiseStats()"""
    permission_classes = [IsAdmin]

    def get(self, request):
        sessions    = InterviewSession.objects.filter(completed=True).values("domain", "final_report")
        domain_map  = {}
        for s in sessions:
            d = s["domain"] or "Unknown"
            if d not in domain_map:
                domain_map[d] = {"domain": d, "count": 0, "total": 0}
            domain_map[d]["count"] += 1
            score = (s.get("final_report") or {}).get("scores", {}).get("overall")
            if isinstance(score, (int, float)):
                domain_map[d]["total"] += score

        stats = [
            {
                "domain":   v["domain"],
                "count":    v["count"],
                "avgScore": f"{(v['total'] / v['count']):.2f}" if v["count"] else "0.00",
            }
            for v in domain_map.values()
        ]
        return Response(stats)


class UserListView(APIView):
    """GET /api/admin/users — port of listUsers()"""
    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by("-created_at")
        interview_counts = {
            row["user_id"]: row["cnt"]
            for row in InterviewSession.objects.values("user_id").annotate(cnt=Count("id"))
        }
        data = []
        for u in users:
            user_dict = UserSerializer(u).data
            user_dict["interviewCount"] = interview_counts.get(u.id, 0)
            data.append(user_dict)
        return Response({"users": data})


class UserRoleView(APIView):
    """PATCH /api/admin/users/<userId>/role — port of updateUserRole()"""
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        account_type = request.data.get("accountType")
        if account_type not in VALID_ROLES:
            return Response({"message": f"Invalid role. Allowed: {', '.join(VALID_ROLES)}"}, status=400)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        user.account_type = account_type
        user.save(update_fields=["account_type"])
        return Response({"message": "Role updated", "accountType": account_type})


class UserDeleteView(APIView):
    """DELETE /api/admin/users/<userId> — port of deleteUser()"""
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        user.delete()
        return Response({"message": "User deleted"})


class InstitutionView(APIView):
    """
    GET  /api/admin/institutions — port of listInstitutions()
    POST /api/admin/institutions — port of createInstitution()
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        institutions = Institution.objects.all().order_by("-created_at")
        return Response([_institution_dict(i) for i in institutions])

    def post(self, request):
        data            = request.data
        name            = data.get("name")
        allowed_domains = data.get("allowedDomains")
        student_limit   = data.get("studentLimit")
        if not name or not allowed_domains or not student_limit:
            return Response({"message": "name, allowedDomains, and studentLimit are required"}, status=400)

        institution = Institution.objects.create(
            name              = name,
            allowed_domains   = allowed_domains if isinstance(allowed_domains, list) else [allowed_domains],
            per_student_price = data.get("perStudentPrice", 0),
            student_limit     = student_limit,
            approval_status   = "PENDING",
        )
        return Response(_institution_dict(institution), status=201)


class InstitutionStatusView(APIView):
    """PUT /api/admin/institutions/<institutionId>/status — port of updateInstitutionStatus()"""
    permission_classes = [IsAdmin]

    def put(self, request, institution_id):
        status_val = request.data.get("status")
        if status_val not in VALID_STATUSES:
            return Response({"message": f"Invalid status. Must be {', '.join(VALID_STATUSES)}."}, status=400)
        try:
            institution = Institution.objects.get(pk=institution_id)
        except Institution.DoesNotExist:
            return Response({"message": "Institution not found"}, status=404)
        institution.approval_status = status_val
        institution.save(update_fields=["approval_status"])
        return Response(_institution_dict(institution))
