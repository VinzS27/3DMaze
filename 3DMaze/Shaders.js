
/**
 * Compiles either a shader of type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 */
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
   
  console.log("Shader error: <pre>" + gl.getShaderInfoLog(shader) + "</pre>");
  gl.deleteShader(shader);
}


//create program with the shaders initialized
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  // Attach pre-existing shaders
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  console.log("Shader program error: <pre>" + gl.getProgramInfoLog(program) + "</pre>");
  gl.deleteProgram(program);
}



function initShaders( gl, vertexShaderId, fragmentShaderId )
{
    var vertexShaderSource = document.getElementById(vertexShaderId).text;
    var fragmentShaderSource = document.getElementById(fragmentShaderId).text;
     
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);


    var program = createProgram(gl, vertexShader, fragmentShader);
    return program;

}
