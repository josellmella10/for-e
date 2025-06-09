const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQPf7p3pBowBEPJrepNP1nFCu0FJVBZGcLGhjItxgaRCxKMcOBnquo4Of0LJKpbhDR/exec";

let usuarioGoogle = null;

function mostrarSeccion(id) {
  const secciones = document.querySelectorAll('.seccion');
  secciones.forEach(sec => sec.classList.add('oculto'));
  document.getElementById(id).classList.remove('oculto');
}

function coordinarRetiro() {
  const pesos = {
    polera: 200, pantalon: 500, short: 250, falda: 300, poleron: 600,
    chaqueta: 800, calcetines: 80, ropa_interior: 100, guantes: 120,
    gorro: 150, bufanda: 200
  };

  let pesoTotal = 0;
  const inputs = document.querySelectorAll("#tabla-prendas input");

  inputs.forEach(input => {
    const tipo = input.dataset.tipo;
    const cantidad = parseInt(input.value) || 0;
    if (pesos[tipo]) pesoTotal += cantidad * pesos[tipo];
  });

  const kilos = (pesoTotal / 1000).toFixed(2);
  

  const mensaje = `Hola, quiero donar ropa y quiero coordinar el retiro`;
  const url = `https://wa.me/56984113919?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  // Registrar métrica "donacion"
  fetch(`${SCRIPT_URL}?accion=contarDonacion`)
    .then(() => console.log("Métrica de donación registrada"))
    .catch(err => console.error("Error al registrar métrica:", err));

    // Mostrar ahorro de agua
    const litrosAhorrados = (totalKg * 2.216).toFixed(1);
    document.getElementById('resultado-impacto').innerText =
      `🌱 Ahorras aproximadamente ${litrosAhorrados} litros de agua.`;
}

function actualizarContador() {
  fetch(`${SCRIPT_URL}?accion=todos`)
    .then(res => res.json())
    .then(data => {
      let total = 0;
      data.forEach(d => {
        if (d.estado === "Retirado") {
          const val = parseFloat(d.cantidad);
          if (!isNaN(val)) total += val;
        }
      });
      document.getElementById("contador-kilos").textContent =
        `🧺 ${total.toFixed(2)} kg donados`;
    })
    .catch(err => {
      document.getElementById("contador-kilos").textContent =
        "🧺 0 kg donados";
      console.error(err);
    });
}

window.onload = () => {
  fetch(`${SCRIPT_URL}?accion=contarVisita`);

  const usuarioGuardado = localStorage.getItem("usuarioGoogle");
  if (usuarioGuardado) {
    usuarioGoogle = JSON.parse(usuarioGuardado);
    document.getElementById("google-login").style.display = "none";
    document.getElementById("cerrar-sesion").classList.remove("oculto");
    document.getElementById("saludo-usuario").textContent = `Hola, ${usuarioGoogle.name} 👋`;
    document.getElementById("saludo-usuario").classList.remove("oculto");
  } else {
    google.accounts.id.initialize({
      client_id: "773149395160-l8c89qgkfslhpegpfq76787artk4c8ct.apps.googleusercontent.com",
      callback: manejarLogin
    });

    google.accounts.id.renderButton(
      document.getElementById("google-login"),
      { theme: "outline", size: "large" }
    );
    google.accounts.id.prompt();
  }

  actualizarContador();
};

function manejarLogin(response) {
  const nuevoUsuario = parseJwt(response.credential);
  const yaGuardado = JSON.parse(localStorage.getItem("usuarioGoogle"));
  if (yaGuardado && yaGuardado.email === nuevoUsuario.email) return;

  usuarioGoogle = nuevoUsuario;
  localStorage.setItem("usuarioGoogle", JSON.stringify(usuarioGoogle));

  document.getElementById("google-login").style.display = "none";
  document.getElementById("cerrar-sesion").classList.remove("oculto");
  document.getElementById("saludo-usuario").textContent = `Hola, ${usuarioGoogle.name} 👋`;
  document.getElementById("saludo-usuario").classList.remove("oculto");

  fetch(`${SCRIPT_URL}?accion=contarLogin`);
}

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join('')));
}

document.getElementById("cerrar-sesion").addEventListener("click", () => {
  localStorage.removeItem("usuarioGoogle");
  location.reload();
});

function verMisDonaciones() {
  if (!usuarioGoogle) {
    alert("Debes iniciar sesión para ver tus donaciones.");
    return;
  }

  fetch(`${SCRIPT_URL}?correo=${usuarioGoogle.email}&accion=verTodas`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#tabla-donaciones tbody");
      tbody.innerHTML = "";

      if (!data.length) {
        tbody.innerHTML = "<tr><td colspan='4'>No tienes donaciones registradas aún.</td></tr>";
      } else {
        data.forEach((donacion) => {
          const fechaOriginal = new Date(donacion.fecha);
          const fechaClave = fechaOriginal.toISOString();

          const fila = document.createElement("tr");
          fila.innerHTML = `
            <td>${fechaOriginal.toLocaleDateString()}</td>
            <td>${donacion.cantidad}</td>
            <td>${donacion.estado}</td>
            <td><button onclick="eliminarDonacion('${fechaClave}')">🗑️</button></td>
          `;
          tbody.appendChild(fila);
        });
      }

      mostrarSeccion("mis-donaciones");
    })
    .catch(err => {
      alert("Error al cargar tus donaciones.");
      console.error(err);
    });
}

function eliminarDonacion(Fecha) {
  if (!usuarioGoogle) {
    alert("Debes iniciar sesión.");
    return;
  }

  if (!confirm("¿Eliminar esta donación?")) return;

  fetch(`${SCRIPT_URL}?correo=${usuarioGoogle.email}&accion=eliminarPorFecha&fecha=${encodeURIComponent(Fecha)}`)
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      verMisDonaciones();
      actualizarContador();
    })
    .catch(err => {
      alert("Error al eliminar la donación.");
      console.error(err);
    });
}
