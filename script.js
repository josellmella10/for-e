const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhsXz5tRfbIxi91_nYSPLFaOSmyR1YAqbF1sE8TBNsb5z2aFkMjufnwEzuP_OtXiGR/exec";

let usuarioGoogle = null;

function mostrarSeccion(id) {
  const secciones = document.querySelectorAll('.seccion');
  secciones.forEach(sec => sec.classList.add('oculto'));
  document.getElementById(id).classList.remove('oculto');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enviarFormulario(e) {
  e.preventDefault();

  if (!usuarioGoogle) {
    alert("Debes iniciar sesión con Google para donar.");
    return;
  }

  const datos = {
    nombre: document.getElementById("nombre").value,
    telefono: document.getElementById("telefono").value,
    direccion: document.getElementById("direccion").value,
    cantidad: document.getElementById("cantidad").value,
    correo: usuarioGoogle.email
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(datos)
  })
  .then(res => {
    document.querySelector("form").reset();
    obtenerEstadoDonacion(usuarioGoogle.email);
    mostrarSeccion("estado-donacion");
    actualizarContador();
  })
  .catch(err => {
    alert("Error al enviar la donación.");
    console.error(err);
  });
}

function actualizarContador() {
  fetch(SCRIPT_URL)
    .then(res => res.json())
    .then(data => {
      document.getElementById("contador-kilos").textContent =
        `🧺 ${data.total} kg donados`;
    })
    .catch(err => {
      document.getElementById("contador-kilos").textContent =
        "Error al cargar datos :C";
      console.error(err);
    });
}

function obtenerEstadoDonacion(correo) {
  fetch(`${SCRIPT_URL}?correo=${correo}`)
    .then(res => res.json())
    .then(data => {
      const estado = data.estado;
      const kilos = parseFloat(data.cantidad);
      const monedas = Math.floor(kilos);

      document.getElementById("estado-donacion").classList.remove("oculto");

      document.getElementById("monedas-obtenidas").textContent =
        `🎉 Has ganado ${monedas} moneda${monedas !== 1 ? 's' : ''} For-e 🎉`;

      document.getElementById("paso1").textContent =
        estado === "En confirmación" || !estado ? "✅ En confirmación" : "🔘 En confirmación";
      document.getElementById("paso2").textContent =
        estado === "En busca de la ropa" ? "✅ En busca de la ropa" :
        estado === "Ropa obtenida" ? "🔘 En busca de la ropa" : "⚪ En busca de la ropa";
      document.getElementById("paso3").textContent =
        estado === "Ropa obtenida" ? "✅ Ropa obtenida" : "⚪ Ropa obtenida";
    })
    .catch(err => {
      console.error("Error al obtener el estado de la donación:", err);
    });
}

window.onload = () => {
  const usuarioGuardado = localStorage.getItem("usuarioGoogle");

  if (usuarioGuardado) {
    // Restaurar sesión desde localStorage
    usuarioGoogle = JSON.parse(usuarioGuardado);
    document.getElementById("google-login").style.display = "none";
    document.getElementById("donar").style.display = "block";
    document.getElementById("cerrar-sesion").classList.remove("oculto");
    document.getElementById("saludo-usuario").textContent = `Hola, ${usuarioGoogle.name} 👋`;
    document.getElementById("saludo-usuario").classList.remove("oculto");
    mostrarSeccion("donar");
    obtenerEstadoDonacion(usuarioGoogle.email);
  } else {
    // Solo mostrar botón si no hay sesión
    google.accounts.id.initialize({
      client_id: "773149395160-l8c89qgkfslhpegpfq76787artk4c8ct.apps.googleusercontent.com",
      callback: manejarLogin
    });

    google.accounts.id.renderButton(
      document.getElementById("google-login"),
      { theme: "outline", size: "large" }
    );

    google.accounts.id.prompt(); // Muestra el One Tap
  }
};


function manejarLogin(response) {
  const nuevoUsuario = parseJwt(response.credential);

  // Si ya está guardado el mismo usuario, no hacer todo de nuevo
  const yaGuardado = JSON.parse(localStorage.getItem("usuarioGoogle"));
  if (yaGuardado && yaGuardado.email === nuevoUsuario.email) return;
  

  usuarioGoogle = nuevoUsuario;
  localStorage.setItem("usuarioGoogle", JSON.stringify(usuarioGoogle));

  document.getElementById("google-login").style.display = "none";
  document.getElementById("donar").style.display = "block";
  document.getElementById("cerrar-sesion").classList.remove("oculto");
  document.getElementById("saludo-usuario").textContent = `Hola, ${usuarioGoogle.name} 👋`;
  document.getElementById("saludo-usuario").classList.remove("oculto");

  mostrarSeccion("donar");
  obtenerEstadoDonacion(usuarioGoogle.email);
}


function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join('')));
}

// Cerrar sesión
document.getElementById("cerrar-sesion").addEventListener("click", () => {
  localStorage.removeItem("usuarioGoogle");
  location.reload();
});

actualizarContador();
function verMisDonaciones() {
  if (!usuarioGoogle) {
    alert("Debes iniciar sesión para ver tus donaciones.");
    return;
  }

  fetch(`${SCRIPT_URL}?correo=${usuarioGoogle.email}&accion=verTodas`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#tabla-donaciones tbody");
      tbody.innerHTML = ""; // limpiar antes

      if (!data.length) {
        tbody.innerHTML = "<tr><td colspan='4'>No tienes donaciones registradas aún.</td></tr>";
      } else {
        data.forEach((donacion, index) => {
          const fechaOriginal = new Date(donacion.fecha);
          const fechaClave = fechaOriginal.toISOString(); // aquí se define

          const fila = document.createElement("tr");
          fila.innerHTML = `
            <td>${fechaOriginal.toLocaleDateString()}</td>
            <td>${donacion.cantidad}</td>
            <td>${donacion.direccion}</td>
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
      verMisDonaciones(); // actualiza la vista
      actualizarContador(); // actualiza el contador de kilos
    })
    .catch(err => {
      alert("Error al eliminar la donación.");
      console.error(err);
    });
}
