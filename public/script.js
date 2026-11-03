
const $ = (id) => document.getElementById(id);

const views = ["dashboard", "members", "plans", "subscriptions"];

let membersCache = [];
let plansCache = [];

// ================= API FUNCTION =================

async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
    }

    return data;
}

// ================= NOTIFICATION =================

function notify(message) {
    const box = $("message");

    box.textContent = message;
    box.classList.remove("hidden");

    setTimeout(() => {
        box.classList.add("hidden");
    }, 3000);
}

// ================= NAVIGATION =================

function showView(view) {
    views.forEach(v => {
        $(v).classList.toggle("hidden", v !== view);
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    $("pageTitle").textContent =
        view === "plans"
            ? "Membership Plans"
            : view[0].toUpperCase() + view.slice(1);

    if (view === "dashboard") loadDashboard();
    if (view === "members") loadMembers();
    if (view === "plans") loadPlans();
    if (view === "subscriptions") loadSubscriptions();
}

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.view);
    });
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.goto);
    });
});

// ================= DASHBOARD =================

async function loadDashboard() {
    try {
        const data = await api("/api/dashboard");

        $("totalMembers").textContent = data.totalMembers;
        $("totalPlans").textContent = data.totalPlans;
        $("totalSubscriptions").textContent = data.totalSubscriptions;

    } catch (error) {
        notify(error.message);
    }
}

// ================= MEMBERS =================

async function loadMembers() {
    try {
        membersCache = await api("/api/members");

        renderMembers(membersCache);

        $("subscriptionMember").innerHTML =
            '<option value="">Select member</option>' +
            membersCache.map(member => `
                <option value="${member.member_id}">
                    ${escapeHtml(member.name)} (#${member.member_id})
                </option>
            `).join("");

    } catch (error) {
        notify(error.message);
    }
}

function renderMembers(rows) {
    $("membersBody").innerHTML = rows.map(member => `
        <tr>
            <td>${member.member_id}</td>

            <td>
                <strong>${escapeHtml(member.name)}</strong>
            </td>

            <td>${escapeHtml(member.email)}</td>

            <td>${escapeHtml(member.phone)}</td>

            <td>${formatDate(member.join_date)}</td>

            <td>
                <span class="pill ${member.status === "Inactive" ? "inactive" : ""}">
                    ${escapeHtml(member.status)}
                </span>
            </td>

            <td>
                <button class="secondary-btn"
                    onclick="editMember(${member.member_id})">
                    Edit
                </button>

                <button class="danger-btn"
                    onclick="deleteMember(${member.member_id})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("") ||
    '<tr><td colspan="7">No members found.</td></tr>';
}

// Edit member
function editMember(id) {
    const member = membersCache.find(
        item => Number(item.member_id) === Number(id)
    );

    if (!member) return;

    $("memberId").value = member.member_id;
    $("memberName").value = member.name;
    $("memberEmail").value = member.email;
    $("memberPhone").value = member.phone;
    $("memberJoinDate").value = formatDate(member.join_date);
    $("memberStatus").value = member.status;

    $("memberFormTitle").textContent = "Edit Member";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// Delete member
async function deleteMember(id) {
    if (!confirm("Delete this member and their subscriptions?")) {
        return;
    }

    try {
        await api(`/api/members/${id}`, {
            method: "DELETE"
        });

        notify("Member deleted successfully!");

        await loadMembers();
        await loadDashboard();

        if (!$("subscriptions").classList.contains("hidden")) {
            await loadSubscriptions();
        }

    } catch (error) {
        notify(error.message);
    }
}

// Add or update member
$("memberForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = $("memberId").value;

    const body = {
        name: $("memberName").value.trim(),
        email: $("memberEmail").value.trim(),
        phone: $("memberPhone").value.trim(),
        join_date: $("memberJoinDate").value,
        status: $("memberStatus").value
    };

    try {
        await api(
            id ? `/api/members/${id}` : "/api/members",
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(body)
            }
        );

        $("memberForm").reset();
        $("memberId").value = "";

        $("memberFormTitle").textContent = "Add New Member";

        notify(
            id
                ? "Member updated successfully!"
                : "Member added successfully!"
        );

        await loadMembers();
        await loadDashboard();

    } catch (error) {
        notify(error.message);
    }
});

// Clear member form
$("cancelMemberEdit").addEventListener("click", () => {
    $("memberForm").reset();
    $("memberId").value = "";

    $("memberFormTitle").textContent = "Add New Member";
});

// Search members
$("memberSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase();

    const filtered = membersCache.filter(member => {
        return [
            member.name,
            member.email,
            member.phone
        ].some(value =>
            String(value).toLowerCase().includes(query)
        );
    });

    renderMembers(filtered);
});

// ================= MEMBERSHIP PLANS =================

// Load plans
async function loadPlans() {
    try {
        plansCache = await api("/api/plans");

        $("plansBody").innerHTML = plansCache.map(plan => `
            <tr>
                <td>${plan.plan_id}</td>

                <td>
                    <strong>${escapeHtml(plan.plan_name)}</strong>
                </td>

                <td>${plan.duration_months} months</td>

                <td>₹${Number(plan.fee).toFixed(2)}</td>

                <td>${escapeHtml(plan.description || "")}</td>

                <td>
                    <button class="danger-btn"
                        onclick="deletePlan(${plan.plan_id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("") ||
        '<tr><td colspan="6">No membership plans found. Please add a plan.</td></tr>';

        // Subscription plan dropdown
        $("subscriptionPlan").innerHTML =
            '<option value="">Select plan</option>' +
            plansCache.map(plan => `
                <option value="${plan.plan_id}">
                    ${escapeHtml(plan.plan_name)} - ₹${Number(plan.fee).toFixed(2)}
                </option>
            `).join("");

    } catch (error) {
        notify(error.message);
    }
}

// Add membership plan
$("planForm").addEventListener("submit", async event => {
    event.preventDefault();

    const body = {
        plan_name: $("planName").value.trim(),
        duration_months: $("planDuration").value,
        fee: $("planFee").value,
        description: $("planDescription").value.trim()
    };

    try {
        await api("/api/plans", {
            method: "POST",
            body: JSON.stringify(body)
        });

        $("planForm").reset();

        notify("Membership plan added successfully!");

        await loadPlans();
        await loadDashboard();

    } catch (error) {
        notify(error.message);
    }
});

// Delete membership plan
async function deletePlan(id) {
    if (!confirm("Are you sure you want to delete this membership plan?")) {
        return;
    }

    try {
        await api(`/api/plans/${id}`, {
            method: "DELETE"
        });

        notify("Membership plan deleted successfully!");

        await loadPlans();
        await loadDashboard();

    } catch (error) {
        notify(error.message);
    }
}

// ================= SUBSCRIPTIONS =================

async function loadSubscriptions() {
    try {
        await Promise.all([
            loadMembers(),
            loadPlans()
        ]);

        const rows = await api("/api/subscriptions");

        $("subscriptionsBody").innerHTML = rows.map(subscription => `
            <tr>
                <td>${subscription.subscription_id}</td>

                <td>${escapeHtml(subscription.member_name)}</td>

                <td>${escapeHtml(subscription.plan_name)}</td>

                <td>₹${Number(subscription.fee).toFixed(2)}</td>

                <td>${formatDate(subscription.start_date)}</td>

                <td>${formatDate(subscription.end_date)}</td>

                <td>
                    <span class="pill ${subscription.payment_status === "Pending" ? "pending" : ""}">
                        ${escapeHtml(subscription.payment_status)}
                    </span>
                </td>

                <td>
                    <button class="danger-btn"
                        onclick="deleteSubscription(${subscription.subscription_id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("") ||
        '<tr><td colspan="8">No subscriptions found.</td></tr>';

    } catch (error) {
        notify(error.message);
    }
}

// Add subscription
$("subscriptionForm").addEventListener("submit", async event => {
    event.preventDefault();

    const body = {
        member_id: $("subscriptionMember").value,
        plan_id: $("subscriptionPlan").value,
        start_date: $("subscriptionStart").value,
        end_date: $("subscriptionEnd").value,
        payment_status: $("subscriptionStatus").value
    };

    try {
        await api("/api/subscriptions", {
            method: "POST",
            body: JSON.stringify(body)
        });

        $("subscriptionForm").reset();

        notify("Subscription created successfully!");

        await loadSubscriptions();
        await loadDashboard();

    } catch (error) {
        notify(error.message);
    }
});

// Delete subscription
async function deleteSubscription(id) {
    if (!confirm("Delete this subscription?")) {
        return;
    }

    try {
        await api(`/api/subscriptions/${id}`, {
            method: "DELETE"
        });

        notify("Subscription deleted successfully!");

        await loadSubscriptions();
        await loadDashboard();

    } catch (error) {
        notify(error.message);
    }
}

// ================= COMMON FUNCTIONS =================

function formatDate(value) {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ================= INITIAL LOAD =================

loadDashboard();
