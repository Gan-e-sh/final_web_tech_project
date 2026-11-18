
const API = "/api";
const tokenKey = "campusFindToken";
const userKey = "campusFindUser";

let token = localStorage.getItem(tokenKey);
let currentUser = JSON.parse(localStorage.getItem(userKey) || "null");
let authMode = "login";

const $ = (selector) => document.querySelector(selector);

const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(API + path, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// AUTHENTICATION UI

function updateAuthUI() {
    $("#authButton").classList.toggle("hidden", !!currentUser);
    $("#logoutButton").classList.toggle("hidden", !currentUser);

    if (!currentUser) {
        $("#dashboardContent").innerHTML =
            "<p>Login to view your reports and claims.</p>";
    }
    else if (currentUser.role === "admin") {
        $("#dashboardContent").innerHTML = `
            <h2>Welcome, Administrator!</h2>
            <p>
                Signed in as
                <strong>${escapeHTML(currentUser.name)}</strong>
                (${escapeHTML(currentUser.email)}).
            </p>
        `;
    }
    else {
        $("#dashboardContent").innerHTML = `
            <p>
                Signed in as
                <strong>${escapeHTML(currentUser.name)}</strong>
                (${escapeHTML(currentUser.email)}).
            </p>
            <div id="myListings"></div>
            <h3>My claims</h3>
            <div id="myClaims"></div>
        `;
    }

    $("#adminPanel").classList.toggle(
        "hidden",
        currentUser?.role !== "admin"
    );

    if (currentUser?.role === "user") {
        loadDashboard();
    }

    if (currentUser?.role === "admin") {
        loadAdmin();
    }
}

// LOAD ITEMS

async function loadItems() {
    const params = new URLSearchParams();

    if ($("#searchInput").value.trim()) {
        params.set("search", $("#searchInput").value.trim());
    }

    if ($("#categoryFilter").value) {
        params.set("category", $("#categoryFilter").value);
    }

    if ($("#locationFilter").value.trim()) {
        params.set("location", $("#locationFilter").value.trim());
    }

    if ($("#typeFilter").value) {
        params.set("type", $("#typeFilter").value);
    }

    params.set("sort", $("#sortFilter").value);

    try {
        const items = await request(`/items?${params}`);

        $("#itemsGrid").innerHTML = items.length
            ? items.map(itemCard).join("")
            : '<p class="empty">No matching items found.</p>';

        $("#totalItems").textContent = items.length;

        $("#lostItems").textContent =
            items.filter(i => i.type === "lost").length;

        $("#foundItems").textContent =
            items.filter(i => i.type === "found").length;

        $("#returnedItems").textContent =
            items.filter(i => i.status === "returned").length;

    } catch (err) {
        $("#itemsGrid").textContent = err.message;
    }
}

// ITEM CARD

function itemCard(item) {
    const reportedById =
        item.reportedBy?._id || item.reportedBy;

    const currentUserId =
        currentUser?._id || currentUser?.id;

    const canSubmitClaim =
        currentUser?.role === "user" &&
        String(reportedById) !== String(currentUserId) &&
        item.status === "open";

    return `
        <article class="item-card">
            ${item.image
                ? `<img src="${escapeHTML(item.image)}"
                    alt="${escapeHTML(item.title)}">`
                : ""
            }

            <span class="pill ${escapeHTML(item.type)}">
                ${escapeHTML(item.type).toUpperCase()}
            </span>

            <span class="pill">
                ${escapeHTML(item.category)}
            </span>

            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description)}</p>

            <div class="item-meta">
                <span>⌖ ${escapeHTML(item.location)}</span>
                <span>◷ ${new Date(item.date).toLocaleDateString()}</span>
            </div>

            <p>Status: <strong>${escapeHTML(item.status)}</strong></p>

            ${canSubmitClaim
                ? `<button class="btn" type="button"
                    onclick="window.openClaimDialog('${item._id}')">
                    Submit Claim
                   </button>`
                : ""
            }
        </article>
    `;
}

// SUBMIT CLAIM

let selectedClaimItemId = null;

window.openClaimDialog = (itemId) => {
    selectedClaimItemId = itemId;
    $("#claimMessage").value = "";
    $("#claimDialog").classList.remove("hidden");
};

window.closeClaimDialog = () => {
    $("#claimDialog").classList.add("hidden");
    selectedClaimItemId = null;
};

window.confirmClaim = async () => {
    const message = $("#claimMessage").value.trim();

    if (!message) {
        alert("Please enter your claim details.");
        return;
    }

    try {
        await request("/claims", {
            method: "POST",
            body: JSON.stringify({
                itemId: selectedClaimItemId,
                message: message
            })
        });

        alert("Claim submitted successfully!");

        window.closeClaimDialog();
        loadDashboard();
        loadItems();

    } catch (err) {
        alert(err.message);
    }
};

// LOAD USER DASHBOARD

async function loadDashboard() {
    try {
        const [items, claims] = await Promise.all([
            request("/items/mine"),
            request("/claims/mine")
        ]);

        $("#myListings").innerHTML =
            `<h3>My reports (${items.length})</h3>` +

            (items.length
                ? `
                    <table>
                        <tr>
                            <th>Item</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>

                        ${items.map(i => `
                            <tr>
                                <td>${escapeHTML(i.title)}</td>
                                <td>${escapeHTML(i.type)}</td>
                                <td>${escapeHTML(i.status)}</td>
                                <td>
                                    ${
                                        i.status !== "returned"
                                            ? `<button class="btn btn-outline" type="button"
                                                onclick="window.updateItemStatus('${i._id}', 'returned')">
                                                Mark Returned
                                               </button>`
                                            : `<span class="pill">Returned ✓</span>`
                                    }
                                </td>
                            </tr>
                        `).join("")}

                    </table>
                `
                : '<p class="empty">No reports yet.</p>'
            );

        $("#myClaims").innerHTML = claims.length
            ? `
                <table>
                    <tr>
                        <th>Item</th>
                        <th>Claim status</th>
                    </tr>

                    ${claims.map(c => `
                        <tr>
                            <td>${escapeHTML(c.item?.title || "Deleted item")}</td>
                            <td>${escapeHTML(c.status)}</td>
                        </tr>
                    `).join("")}

                </table>
            `
            : '<p class="empty">No claims yet.</p>';

    } catch (err) {
        $("#dashboardContent").textContent = err.message;
    }
}

// UPDATE ITEM STATUS

window.updateItemStatus = async (id, status) => {
    try {
        await request(`/items/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        alert("Item status updated successfully!");

        await Promise.all([
            loadDashboard(),
            loadItems()
        ]);

        if (currentUser?.role === "admin") {
            await loadAdmin();
        }

    } catch (err) {
        alert("Could not update item: " + err.message);
    }
};

// ADMIN DASHBOARD

async function loadAdmin() {
    try {
        const [items, claims] = await Promise.all([
            request("/items/admin/all"),
            request("/claims/admin/all")
        ]);

        $("#adminContent").innerHTML = `
            <p>
                <strong>${items.length}</strong> listings ·
                <strong>${claims.length}</strong> claims ·
                <strong>${claims.filter(c => c.status === "pending").length}</strong>
                pending claims
            </p>

            <h3>All claims</h3>

            ${
                claims.length
                    ? `
                        <table>
                            <tr>
                                <th>Item</th>
                                <th>Claimant</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Review</th>
                            </tr>

                            ${claims.map(c => `
                                <tr>
                                    <td>${escapeHTML(c.item?.title || "Deleted")}</td>
                                    <td>${escapeHTML(c.claimant?.name || "")}</td>
                                    <td>${escapeHTML(c.message)}</td>
                                    <td>${escapeHTML(c.status)}</td>
                                    <td>
                                        ${
                                            c.status === "pending"
                                                ? `
                                                    <button class="btn" type="button"
                                                        onclick="window.reviewClaim('${c._id}', 'approved')">
                                                        Approve
                                                    </button>

                                                    <button class="btn btn-outline" type="button"
                                                        onclick="window.reviewClaim('${c._id}', 'rejected')">
                                                        Reject
                                                    </button>
                                                `
                                                : "—"
                                        }
                                    </td>
                                </tr>
                            `).join("")}
                        </table>
                    `
                    : "<p>No claims.</p>"
            }

            <h3>All listings</h3>

            <table>
                <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>

                ${items.map(i => `
                    <tr>
                        <td>${escapeHTML(i.title)}</td>
                        <td>${escapeHTML(i.status)}</td>
                        <td>
                            ${
                                i.status !== "returned"
                                    ? `<button class="btn btn-outline" type="button"
                                        onclick="window.updateItemStatus('${i._id}', 'returned')">
                                        Mark Returned
                                       </button>`
                                    : `<span class="pill">Returned ✓</span>`
                            }
                        </td>
                    </tr>
                `).join("")}
            </table>
        `;

    } catch (err) {
        $("#adminContent").textContent = err.message;
    }
}

// REVIEW CLAIM

window.reviewClaim = async (id, status) => {
    try {
        await request(`/claims/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        alert(`Claim ${status} successfully!`);

        await Promise.all([
            loadAdmin(),
            loadItems()
        ]);

    } catch (err) {
        alert(err.message);
    }
};

// OPEN LOGIN

$("#authButton").addEventListener("click", () => {
    authMode = "login";
    setAuthMode();
    $("#authDialog").showModal();
});

// LOGOUT

$("#logoutButton").addEventListener("click", () => {
    token = null;
    currentUser = null;

    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);

    updateAuthUI();
    loadItems();
});

// LOGIN / REGISTER SWITCH

$("#showLogin").addEventListener("click", () => {
    authMode = "login";
    setAuthMode();
});

$("#showRegister").addEventListener("click", () => {
    authMode = "register";
    setAuthMode();
});

// SET AUTH MODE

function setAuthMode() {
    $("#authTitle").textContent =
        authMode === "login"
            ? "Welcome back"
            : "Create your account";

    $("#nameLabel").classList.toggle(
        "hidden",
        authMode === "login"
    );

    $("#showLogin").classList.toggle(
        "active",
        authMode === "login"
    );

    $("#showRegister").classList.toggle(
        "active",
        authMode === "register"
    );

    $("#authMessage").textContent = "";
}

// LOGIN / REGISTER FORM

$("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formElement = event.currentTarget;

    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());

    try {
        const data = await request(`/auth/${authMode}`, {
            method: "POST",
            body: JSON.stringify(body)
        });

        if (!data.token || !data.user) {
            throw new Error(
                "Login response is missing token or user information. Check backend authentication."
            );
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem(tokenKey, token);
        localStorage.setItem(userKey, JSON.stringify(currentUser));

        $("#authDialog").close();

        formElement.reset();

        updateAuthUI();
        loadItems();

    } catch (err) {
        $("#authMessage").textContent = err.message;
    }
});

// REPORT SUBMISSION

const reportForm = $("#reportForm");

if (reportForm) {
    reportForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formElement = event.currentTarget;

        if (!currentUser || !token) {
            alert("Please login first.");
            $("#authDialog").showModal();
            return;
        }

        const form = new FormData(formElement);

        try {
            await request("/items", {
                method: "POST",
                body: form
            });

            $("#reportMessage").textContent =
                "Your report was submitted successfully.";

            formElement.reset();

            loadItems();
            loadDashboard();

        } catch (err) {
            $("#reportMessage").textContent = err.message;
        }
    });
}

// SEARCH

$("#searchButton").addEventListener("click", loadItems);

$("#sortFilter").addEventListener("change", loadItems);

["searchInput", "locationFilter"].forEach(id => {
    $("#" + id).addEventListener("keydown", e => {
        if (e.key === "Enter") {
            loadItems();
        }
    });
});

$("#categoryFilter").addEventListener("change", loadItems);
$("#typeFilter").addEventListener("change", loadItems);

// INITIAL LOAD

updateAuthUI();
loadItems();
