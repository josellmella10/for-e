const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4aPw2Pe6IVOyGHE-8myDQSCF5kW82sj8lUvvuZMoTpEtc-ybYmhXYaJUBgl-svIIu/exec";

let usuarioGoogle = null;

function mostrarSeccion(id, hacerScroll = true) {
  const secciones = document.querySelectorAll('.seccion');
  secciones.forEach(sec => sec.classList.add('oculto'));
  document.getElementById(id).classList.remove('oculto');

  
}


function enviarFormulario(e) {
  e.preventDefault();

  if (!usuarioGoogle) {
    alert("Debes iniciar sesión con Google para donar.");
    return;
  }

  const boton = e.submitter || e.target.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Enviando...";

  const pesos = {
    polera: 200,
    pantalon: 500,
    short: 250,
    falda: 300,
    poleron: 600,
    chaqueta: 800,
    calcetines: 80,
    ropa_interior: 100,
    guantes: 120,
    gorro: 150,
    bufanda: 200
  };

  let pesoTotal = 0;
  const inputs = document.querySelectorAll("#tabla-prendas input");

  inputs.forEach(input => {
    const tipo = input.dataset.tipo;
    const cantidad = parseInt(input.value) || 0;
    if (pesos[tipo]) {
      pesoTotal += cantidad * pesos[tipo];
    }
  });

  const kilos = pesoTotal / 1000;
  const litrosSalvados = Math.round(kilos * 2.216 * 100) / 100;

  const datos = {
    nombre: document.getElementById("nombre").value,
    telefono: document.getElementById("telefono").value,
    direccion: document.getElementById("direccion").value,
    cantidad: kilos.toFixed(2),
    correo: usuarioGoogle.email
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(datos)
  })
    .then(res => {
      fetch(`${SCRIPT_URL}?accion=contarDonacion`);
      document.querySelector("form").reset();
      mostrarSeccion("donar");

      document.getElementById("resultado-impacto").innerHTML =
        `🧺 Has donado ${pesoTotal} gramos de ropa<br>💧 Eso equivale a ${litrosSalvados} litros de agua salvada.`;

      actualizarContador();
    })
    .catch(err => {
      alert("Error al enviar la donación.");
      console.error("Error al enviar:", err);
    })
    .finally(() => {
      boton.disabled = false;
      boton.textContent = "Donar";
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



window.onload = () => {
  // Contar visita
  fetch(`${SCRIPT_URL}?accion=contarVisita`);

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
  fetch(`${SCRIPT_URL}?accion=contarLogin`);
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

