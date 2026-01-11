var state = {
  rotation: {
    x: document.getElementById("xrot").value / 180 * math.pi,
    y: document.getElementById("yrot").value / 180 * math.pi,
    order: document.getElementById("rotation_order").value
  },
  camera: {
    focal_length: document.getElementById("focal_length").value,
    scale: document.getElementById("scale").value
  },
  grid_size: document.getElementById("grid_size").value
};

function mod(n, m) {
  return ((n % m) + m) % m;
}

const cubeVertices = [
  [-1, -1, -1],
  [ 1, -1, -1],
  [ 1,  1, -1],
  [-1,  1, -1],
  [-1, -1,  1],
  [ 1, -1,  1],
  [ 1,  1,  1],
  [-1,  1,  1]
];

const cubeEdges = [
  [0,1],[1,2],[2,3],[3,0],
  [4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7]
];



function euc_to_hom(points) {
  return points.map(point => [...point, 1]);
}

function hom_to_euc(points) {
  return points.map(point => point.slice(0, -1).map(dim => dim / point[point.length-1]));
}

function computeScene(state) {
  // 1. Rotate cube vertices
  // 2. Project them to 2D
  // 3. Group edges by direction
  // 4. Compute vanishing points
  x = state.rotation.x;
  y = state.rotation.y;
  x_mat = math.matrix([
    [math.cos(y), 0, math.sin(y)],
    [0, 1, 0],
    [-math.sin(y), 0, math.cos(y)]
  ]);
  y_mat = math.matrix([
    [1, 0, 0],
    [0, math.cos(x), -math.sin(x)],
    [0, math.sin(x), math.cos(x)]
  ]);
  if (state.rotation.order == 0) {
    cube_transform = math.multiply(y_mat,x_mat);
  } else {
    cube_transform = math.multiply(x_mat,y_mat);
  }
  const camera_matrix = math.multiply(math.matrix([
    [state.camera.focal_length * 100 * state.camera.scale, 0, document.getElementById("view").getAttribute("width")/2],
    [0, state.camera.focal_length * 100 * state.camera.scale, document.getElementById("view").getAttribute("height")/2],
    [0, 0, 1]
  ]), math.matrix([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, state.camera.focal_length]
  ]));
  transformed_points_3d = math.multiply(cubeVertices, math.transpose(cube_transform)).toArray();
  points_2d = math.multiply(euc_to_hom(transformed_points_3d), math.transpose(camera_matrix).toArray());
  points_2d = hom_to_euc(points_2d);
  const lines = cubeEdges.map(edge => {
    const [from, to] = edge;
    return [points_2d[from], points_2d[to]];
  });

  vanishing_points = math.multiply([
    [1,0,0],
    [-1,0,0],
    [0,1,0],
    [0,-1,0],
    [0,0,1],
    [0,0,-1]
  ],1000000000000);
  transformed_points_3d = math.multiply(vanishing_points, math.transpose(cube_transform)).toArray();
  points_2d = math.multiply(euc_to_hom(transformed_points_3d), math.transpose(camera_matrix).toArray());
  points_2d = hom_to_euc(points_2d);
  vanishing_points = points_2d;


  return {
    lines,
    vanishing_points
  };
}



function render() {
  const scene = computeScene(state);
  draw(scene);
}

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");

// Mouse event handlers for dragging
let isDragging = false;
canvas.addEventListener("mousedown", (event) => {
  isDragging = true;
  lastX = event.offsetX;
  lastY = event.offsetY;
});

canvas.addEventListener("mousemove", (event) => {
  if (isDragging) {
    const dx = event.offsetX - lastX;
    const dy = event.offsetY - lastY;
    
    // Update rotation based on mouse movement
    state.rotation.y -= dx * 0.01;  // Rotation around the Y-axis
    state.rotation.x += dy * 0.01;  // Rotation around the X-axis

    document.getElementById("xrot").value = mod(state.rotation.x / math.pi * 180, 360).toFixed(1);
    document.getElementById("yrot").value = mod(state.rotation.y / math.pi * 180, 360).toFixed(1);
    
    lastX = event.offsetX;
    lastY = event.offsetY;
    
    render();  // Redraw the cube with updated rotation
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mouseout", () => {
  isDragging = false;
});


canvas.addEventListener('wheel', (e) => {
  // Prevent the default scroll behavior (if necessary)
  e.preventDefault();

  input = document.getElementById("scale");
  scale_current = state.camera.scale;
  scale_new = +scale_current - e.deltaY * 0.01;
  if (scale_new < input.min) scale_new = input.min;
  if (scale_new > input.max) scale_new = input.max;
  if (scale_new == scale_current) return;

  input.value = scale_new;
  state.camera.scale = scale_new;
  render();
  update_grid();
});






document.getElementById("focal_length").addEventListener("input", change_foc_len, false);
function change_foc_len(e) {
  var value = e.target.value;
  state.camera.focal_length = value;
  render();
}

function update_grid() {
  size = math.round(state.camera.scale * state.grid_size);
  bgs = "" + size + "px " + size + "px";
  canvas.style.backgroundSize = bgs;
}

document.getElementById("scale").addEventListener("input", change_scale, false);
function change_scale(e) {
  var value = e.target.value;
  state.camera.scale = value;
  render();
  update_grid();
}

document.getElementById("grid_size").addEventListener("input", e => {
  var value = e.target.value;
  state.grid_size = value;
  update_grid();
});

function draw_line(line) {
  ctx.beginPath();
  ctx.moveTo(...line[0]);
  ctx.lineTo(...line[1]);
  ctx.stroke();
}
function draw_dot(point) {
  const radius = 5;
  // ctx.beginPath();
  // ctx.arc(...point, radius, 0, 2 * Math.PI);
  // ctx.fill();
  // ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(point[0]-radius,point[1]-radius);
  ctx.lineTo(point[0]+radius,point[1]+radius);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(point[0]-radius,point[1]+radius);
  ctx.lineTo(point[0]+radius,point[1]-radius);
  ctx.stroke();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);

function resizeCanvas() {
  canvas.setAttribute("width", window.innerWidth);
  canvas.setAttribute("height", window.innerHeight);
  render();
}

function draw(scene) {
  w = canvas.getAttribute("width");
  h = canvas.getAttribute("height");
  ctx.clearRect(0, 0, w, h);

  scene.lines.forEach(line => {
    draw_line(line);
  });
  scene.vanishing_points.forEach(point => {
    draw_dot(point);
  });

  // drawCube(scene.lines);
  // drawVanishingPoints(scene.vanishingPoints);
}

document.getElementById("xrot").addEventListener('input', (e) => {
  input = e.target;
  if (input.value < 0 || input.value >= 360) {
    input.value = mod(input.value, 360);
  }
  state.rotation.x = input.value / 180 * math.pi;
  render();
});

document.getElementById("yrot").addEventListener('input', (e) => {
  input = e.target;
  if (input.value < 0 || input.value >= 360) {
    input.value = mod(input.value, 360);
  }
  state.rotation.y = input.value / 180 * math.pi;
  render();
});

document.getElementById("rotation_order").addEventListener('input', (e) => {
  input = e.target;
  state.rotation.order = input.value;
  render();
});

update_grid();