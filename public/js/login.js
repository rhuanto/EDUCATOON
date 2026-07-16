const API_URL = "http://localhost:3000/api/auth";
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

function showMessage(text, type) {
  message.textContent = text;
  message.className = `alert ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  loginButton.disabled = true;
  loginButton.textContent = "Validando...";

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.mensaje || "No se pudo iniciar sesión.", "error");
      return;
    }

    localStorage.setItem("educatoon_token", data.token);
    localStorage.setItem("educatoon_usuario", JSON.stringify(data.usuario));

    window.location.href = "./dashboard.html";
  } catch {
    showMessage("No se pudo conectar con el servidor.", "error");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Ingresar";
  }
});
