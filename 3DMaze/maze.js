var gl;

var vertices = [];
var indices = [];
var colors = [];

var maze = [];
// Array of Sets;
// Each set has the row_column hashes for the maze cells in the set
var sets = []; // Each maze cell has the index of the set that it belongs to var maze = [];

var near = 0.01;
var far = 1250.0;
var dr = 5.0 * Math.PI/180.0;

var fovy = 65.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio

var mvMatrix, pMatrix;
var modelView, projection;

var at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var playerPosition = vec3(0.0, 0.0, 0.0);

var playerRowCol;

const MAZE_MAX_COLUMNS = 15; 
const MAZE_MAX_ROWS = 15; 
const SINGLETON = -1;
const MAZE_CELL_LENGTH = 3;
const MAZE_CELL_WIDTH = 3;
const MAZE_CELL_HEIGHT = 3;

var lightPosition = vec4((MAZE_CELL_WIDTH * MAZE_MAX_COLUMNS) / 2.0, MAZE_CELL_HEIGHT * 5.0, (MAZE_CELL_LENGTH * MAZE_MAX_ROWS) / 2.0, 0.0 );
var lightAmbient =  vec4(0.75, 0.75, 0.75, 1.0 );
var lightDiffuse =  vec4(1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0 );

//material properties
var materialAmbient = vec4(0.5, 0.6, 0.1, 1.0);
var materialDiffuse = vec4(0.2, 0.2, 0.2, 1.0);
var materialSpecular = vec4(0.1, 0.7, 0.4, 1.0);
var materialShininess = 100.0;
var ambientColor, diffuseColor, specularColor;


// player eye
const NORTH = "NORTH";
const SOUTH = "SOUTH";
const WEST = "WEST";
const EAST = "EAST";
const DIRECTION = [NORTH, EAST, SOUTH, WEST];

var playerDirection = 0; // default to NORTH until we can place the player in the maze

var mazeStartRow;
var mazeStartCol;
var mazeFinishRow;
var mazeFinishCol;

class MazeCell {
    constructor() {
        this.set = SINGLETON;
        this.northWall = true;
        this.southWall = true;
        this.eastWall  = true;
        this.westWall  = true;
    }
}

// maze cell colors
const START_CELL_FLOOR_COLOR = vec4(0.0, 0.5, 0.0, 1.0);  
const START_CELL_WALL_COLOR = vec4(0.196078431372549, 0.803921568627451, 0.196078431372549, 0.9);
const FINISH_CELL_FLOOR_COLOR = vec4(0.698039215686275, 0.133333333333333, 0.133333333333333, 1.0);
const FINISH_CELL_WALL_COLOR = vec4(0.862745098039216, 0.07843137254902, 0.235294117647059, 0.9);
const CELL_FLOOR_COLOR = vec4(0.4, 0.4, 0.4, 1.0);
const CELL_WALL_COLOR = vec4(0.541176470588235, 0.568627450980392, 0.586274509803922, 0.9);

// backoff from the center of the maze cell
const BACKOFF_DISTANCE = 1.5;

const INTERPOLATION_COUNT = 30;
var interpolatedAtArray;
var interpolatedPlayerPositionArray;

function getCenterOfMazeCell(cellRow, cellCol) {
    return vec3( 
        (cellCol * MAZE_CELL_LENGTH) + (MAZE_CELL_LENGTH  / 2),
        (MAZE_CELL_HEIGHT / 2),
        (cellRow * MAZE_CELL_WIDTH) + (MAZE_CELL_WIDTH / 2));
} 

/** Player moviments */


function getPlayerDirection() {
    return DIRECTION[playerDirection];
}

function updatePlayerPositionAndAt() {
    var playerFacing = getPlayerDirection();
    var playerRow = playerRowCol[0];
    var playerCol = playerRowCol[1];
    var atRow;
    var atCol;
    var backoff_direction;
    if (playerFacing === NORTH) {
        atRow = playerRow - 1;
        atCol = playerCol;
        backoff_direction = vec3(0, 0, BACKOFF_DISTANCE);
    } else if (playerFacing === SOUTH) {
        atRow = playerRow + 1;
        atCol = playerCol; 
        backoff_direction = vec3(0, 0, -BACKOFF_DISTANCE);
    } else if (playerFacing === WEST) {
        atRow = playerRow;
        atCol = playerCol - 1; 
        backoff_direction = vec3(BACKOFF_DISTANCE, 0, 0);
    } else if (playerFacing === EAST) {
        atRow = playerRow;
        atCol = playerCol + 1; 
        backoff_direction = vec3(-BACKOFF_DISTANCE, 0, 0);
    }
    playerPosition = add(getCenterOfMazeCell(playerRow, playerCol), backoff_direction);
    at = getCenterOfMazeCell(atRow, atCol);
}

function animateUpdate() {
    var oldAt = at;
    var oldPlayerPosition = playerPosition;
    updatePlayerPositionAndAt();
    var newAt = at;
    var newPlayerPosition = playerPosition;
    interpolatedAtArray = interpolate(oldAt, newAt, INTERPOLATION_COUNT).concat(newAt);
    interpolatedPlayerPositionArray = interpolate(oldPlayerPosition, newPlayerPosition, INTERPOLATION_COUNT).concat(newPlayerPosition);
    render();
}

function turnRight() {
    playerDirection = (playerDirection + 1) % DIRECTION.length;
    animateUpdate();
}

function turnLeft() {
    playerDirection = (playerDirection - 1);
    if (playerDirection < 0) {
        playerDirection = DIRECTION.length - 1;
    }  
    animateUpdate();
}

function turnAround() {
    playerDirection = (playerDirection + 2) % DIRECTION.length; // turn right twice
    animateUpdate();
}

function canGoForward() {
    var playerFacing = getPlayerDirection();
    var playerRow = playerRowCol[0];
    var playerCol = playerRowCol[1];
    var currentMazeCell = maze[playerRow][playerCol];
    if ( (currentMazeCell.northWall && (playerFacing === NORTH)) ||
         (currentMazeCell.southWall && (playerFacing === SOUTH)) ||
         (currentMazeCell.eastWall  && (playerFacing === EAST))  ||
         (currentMazeCell.westWall  && (playerFacing === WEST))  ) {
        return false;    
    }
    return true;
}

function checkForWin() {
    var playerRow = playerRowCol[0];
    var playerCol = playerRowCol[1];
    var retVal = false;
    if ( (playerRow === mazeFinishRow) &&
         (playerCol === mazeFinishCol) ) {
        alert("You Win!");
        retVal = true;
        location.reload();
    }
    return retVal;
}

function goForward() {
    if (canGoForward() ) {
        var playerFacing = getPlayerDirection();
        var playerRow = playerRowCol[0];
        var playerCol = playerRowCol[1];
        if (playerFacing === NORTH) {
            playerRow = playerRow - 1;
        } else if (playerFacing === SOUTH) {
            playerRow = playerRow + 1;
        } else if (playerFacing === WEST) {
            playerCol = playerCol - 1;
        } else if (playerFacing === EAST) {
            playerCol = playerCol + 1;
        }
        playerRowCol[0] = playerRow;
        playerRowCol[1] = playerCol;
        animateUpdate();
        checkForWin();
    } else {
        alert("There is a wall!");
    }
}

function selectRandomStartAndFinish() {
    // select start to be a random corner and 
    // select finish to be the opposite corner
    var randomNum = Math.random();

    if ((randomNum >= 0.00) && (randomNum < 0.25)) { // top left start
        mazeStartRow = 0;
        mazeStartCol = 0;
        mazeFinishRow = MAZE_MAX_ROWS - 1;
        mazeFinishCol = MAZE_MAX_COLUMNS  - 1;
    } else if ((randomNum >= 0.25) && (randomNum < 0.50)) { // top right start
        mazeStartRow = 0;
        mazeStartCol = MAZE_MAX_COLUMNS - 1;
        mazeFinishRow = MAZE_MAX_ROWS - 1;
        mazeFinishCol = 0;
    } else if ((randomNum >= 0.50) && (randomNum < 0.75)) { // bottom left start
        mazeStartRow = MAZE_MAX_ROWS - 1;
        mazeStartCol = 0;
        mazeFinishRow = 0
        mazeFinishCol = MAZE_MAX_COLUMNS - 1;
    } else if ((randomNum >= 0.75) && (randomNum < 1.00)) { // bottom right start
        mazeStartRow = MAZE_MAX_ROWS - 1;
        mazeStartCol = MAZE_MAX_COLUMNS  - 1;
        mazeFinishRow = 0;
        mazeFinishCol = 0;
    } 
    playerRowCol=vec2(mazeStartRow, mazeStartCol);
}

function setInitialPlayerPositionAndAtLocation() {
    // place the player position at the maze start
    playerRowCol[0] = mazeStartRow;
    playerRowCol[1] = mazeStartCol;
    var startMazeCell = maze[mazeStartRow][mazeStartCol];
    if (! (startMazeCell.northWall)) {
        playerDirection = 0; // NORTH
    }  
    if (! (startMazeCell.eastWall)) {
        playerDirection = 1; // EAST
    }
    if (! (startMazeCell.southWall)) {
        playerDirection = 2; // SOUTH
    }  
    if (! (startMazeCell.westWall)) {
        playerDirection = 3; // WEST
    }
    updatePlayerPositionAndAt();
}

function cellHash(cellRow, cellCol) {
    return "" + cellRow + "_" + cellCol;
}

function invertCellHash(cellHashString) {
    return cellHashString.split("_");
}

function setCellSet(cellRow, cellCol, setIndex) {
    // delete cell from current set
    var oldSetIndex = findCellSet(cellRow, cellCol);
    if (oldSetIndex !== SINGLETON) {
        sets[oldSetIndex].delete(cellHash(cellRow, cellCol));
    }
    // put cell into requested set
    maze[cellRow][cellCol].set = setIndex;
    sets[setIndex].add(cellHash(cellRow, cellCol));
}

function findCellSet(cellRow, cellCol) {
    return maze[cellRow][cellCol].set;
}

function getCellsInSet(setIndex) {
    var cells = [];
    for (let [key, value] of sets[setIndex].entries()) {
        cells.push(key);
    }
    return cells;
}

function unionCellSets(cellARow, cellACol, cellBRow, cellBCol) {
    var cellASet = findCellSet(cellARow, cellACol);
    var cellBSet = findCellSet(cellBRow, cellBCol);

    if ( (cellASet === SINGLETON) && (cellBSet === SINGLETON) ) {
        // make a new Set
        var index = sets.length;
        sets[index] = new Set();
        setCellSet(cellARow, cellACol, index);
        setCellSet(cellBRow, cellBCol, index);

    } else if ( (cellASet === SINGLETON) && (cellBSet !== SINGLETON) ) {
        // combine cellA into cellB's set
        setCellSet(cellARow, cellACol, cellBSet);

    } else if ( (cellASet !== SINGLETON) && (cellBSet === SINGLETON) ) {
        // combine cellB into cellA's set
        setCellSet(cellBRow, cellBCol, cellASet);

    } else if ( (cellASet !== SINGLETON) && (cellBSet !== SINGLETON) ) {
        // combine all of the smaller set into the larger set
        var cellASetSize = sets[cellASet].size;
        var cellBSetSize = sets[cellBSet].size;
        if (cellASetSize >= cellBSetSize) { 
            // combine into set A
            var setBcells = getCellsInSet(cellBSet);
            for (var i = 0; i < setBcells.length; i++) {
                var currentCellHash = setBcells[i];
                var invertedCellHash = invertCellHash(currentCellHash);
                var currentCellRow = invertedCellHash[0];
                var currentCellCol = invertedCellHash[1];
                setCellSet(currentCellRow, currentCellCol, cellASet);
            }
        } else {
            // combine into set B
            var setAcells = getCellsInSet(cellASet);
            for (var i = 0; i < setAcells.length; i++) {
                var currentCellHash = setAcells[i];
                var invertedCellHash = invertCellHash(currentCellHash);
                var currentCellRow = invertedCellHash[0];
                var currentCellCol = invertedCellHash[1];
                setCellSet(currentCellRow, currentCellCol, cellBSet);
            }
        }
    }
}

function connectCellWalls(cellARowStr, cellAColStr, cellBRowStr, cellBColStr) {
    var cellARow = parseInt(cellARowStr,10);
    var cellACol = parseInt(cellAColStr,10);
    var cellBRow = parseInt(cellBRowStr,10);
    var cellBCol = parseInt(cellBColStr,10);
    if (cellARow === cellBRow) {
        if (cellACol === (cellBCol + 1)) { // cellA is to the right of cellB
            maze[cellBRow][cellBCol].eastWall = false;
            maze[cellARow][cellACol].westWall = false;
        } else if (cellBCol === (cellACol + 1)) { // cellA is to the left of cellB
            maze[cellARow][cellACol].eastWall = false;
            maze[cellBRow][cellBCol].westWall = false;
        }
    } else if (cellACol === cellBCol) { 
        if (cellARow === (cellBRow + 1)) { // cellA is below cellB
            maze[cellARow][cellACol].northWall = false;
            maze[cellBRow][cellBCol].southWall = false;
        } else if (cellBRow === (cellARow + 1)) { // cellA is above cellB
            maze[cellARow][cellACol].southWall = false;
            maze[cellBRow][cellBCol].northWall = false;
        }
    }    
}

// we only consider four cardinal directions (no diagonals)
function getAdjacentCellHashes(cellRow, cellCol) {
    var adjacentCellHashes = [];
    // above
    if (cellRow > 0) {
        adjacentCellHashes.push( cellHash(parseInt(cellRow, 10) - 1, parseInt(cellCol, 10) ) );
    }  
    // left
    if (cellCol > 0) {
        adjacentCellHashes.push( cellHash(parseInt(cellRow, 10), parseInt(cellCol, 10) - 1) );
    }
    // right
    if (cellCol < (MAZE_MAX_COLUMNS - 1) ) {
        adjacentCellHashes.push( cellHash(parseInt(cellRow, 10), parseInt(cellCol, 10) + 1) );
    }
    // below
    if (cellRow < (MAZE_MAX_ROWS - 1) ) {
        adjacentCellHashes.push( cellHash(parseInt(cellRow, 10) + 1, parseInt(cellCol, 10)) );
    }  
    return adjacentCellHashes;
}

function getRandomMazeCellHash() {
    var row = Math.round(Math.random() * (MAZE_MAX_ROWS - 1) );
    var col = Math.round(Math.random() * (MAZE_MAX_COLUMNS - 1) );
    return cellHash(row, col);
}

function filterOutCellHashesInSet(cellHashArray, setIndex) {
    var filteredCellHashes = [];
    for (var i = 0; i < cellHashArray.length; i++) {
        var currentCellHash = cellHashArray[i];
        var currentCellVec = invertCellHash(currentCellHash);
        var currentCellSetIndex = findCellSet(currentCellVec[0], currentCellVec[1]);
        if ((currentCellSetIndex === SINGLETON) || 
            (setIndex === SINGLETON) || 
            (currentCellSetIndex !== setIndex) ) {
            filteredCellHashes.push(currentCellHash);
        }
    }
    return filteredCellHashes;
}

function unionRandomCells() {
    // get a random maze cell
    var randomCellHash = getRandomMazeCellHash();
    
    var randomCellVec = invertCellHash(randomCellHash);
    var randomCellSetIndex = findCellSet(randomCellVec[0], randomCellVec[1]);
    
    // get adjacent maze cells not in the same set
    var adjacentCellHashes = getAdjacentCellHashes(randomCellVec[0], randomCellVec[1]);

    var filteredCellHashes = filterOutCellHashesInSet(adjacentCellHashes, randomCellSetIndex);

    // union the two sets
    if (filteredCellHashes.length > 0) { 
        // choose a random adjacent cell
        
        var randomFilteredCellHashIndex = Math.round(Math.random() * (filteredCellHashes.length - 1));

        var chosenFilteredCellHash = filteredCellHashes[randomFilteredCellHashIndex];
        var chosenFilteredCellVec = invertCellHash(chosenFilteredCellHash);
        unionCellSets(randomCellVec[0], randomCellVec[1], chosenFilteredCellVec[0], chosenFilteredCellVec[1]);
        connectCellWalls(randomCellVec[0], randomCellVec[1], chosenFilteredCellVec[0], chosenFilteredCellVec[1]);
    } 
}

function startAndFinishAreLinked() {
    var result = false;
    var startSetIndex = findCellSet(mazeStartRow, mazeStartCol);
    var finishSetIndex = findCellSet(mazeFinishRow, mazeFinishCol);
    if ( (startSetIndex  !== SINGLETON) &&
         (finishSetIndex !== SINGLETON) &&
         (startSetIndex === finishSetIndex) ) {
        result = true;
    }
    return result;
}

function initMaze() {
    for (var i = 0; i < MAZE_MAX_ROWS; i++) {
        maze[i] = [];
        for (var j = 0; j < MAZE_MAX_COLUMNS; j++) {
            maze[i][j] = new MazeCell();
        }
    }
    selectRandomStartAndFinish();
    while (! startAndFinishAreLinked() ) {
        unionRandomCells();
    }
    for (var row = 0; row < MAZE_MAX_ROWS; row++) {
        for (var col = 0; col < MAZE_MAX_COLUMNS; col++) {
            convertMazeCellTo3D(row, col);
        }
    }
    setInitialPlayerPositionAndAtLocation();
}

/**concatenate the points */
function makeRectangle(ptA, ptB, ptC, ptD, color) {
	var index = vertices.length / 3;
	vertices = vertices.concat(ptA);
	colors = colors.concat(color);	
	vertices = vertices.concat(ptB);
	colors = colors.concat(color);	
	vertices = vertices.concat(ptC);
	colors = colors.concat(color);	
	vertices = vertices.concat(ptD);
	colors = colors.concat(color);	
	indices.push(index);
	indices.push(index + 1);
	indices.push(index + 2);
	indices.push(index);
	indices.push(index + 2);
	indices.push(index + 3);
}


/** Create the 3D MAZE transforming the coordinates in a rectangle  */
function convertMazeCellTo3D(cellRow, cellCol) {
    var floorColor;
    var wallColor;
    // get color to use
    if ( (cellRow === mazeStartRow) && (cellCol === mazeStartCol) ) {
        floorColor = START_CELL_FLOOR_COLOR;
        wallColor = START_CELL_WALL_COLOR;
    } else if ( (cellRow === mazeFinishRow) && (cellCol === mazeFinishCol) ) {
        floorColor = FINISH_CELL_FLOOR_COLOR;
        wallColor = FINISH_CELL_WALL_COLOR;
    }  else {
        floorColor = CELL_FLOOR_COLOR;
        wallColor = CELL_WALL_COLOR;
    }
    // draw floor
    var floorPointA = vec3(MAZE_CELL_WIDTH * cellCol,       0, MAZE_CELL_LENGTH * cellRow); 
    var floorPointB = vec3(MAZE_CELL_WIDTH * (cellCol + 1), 0, MAZE_CELL_LENGTH * cellRow); 
    var floorPointC = vec3(MAZE_CELL_WIDTH * (cellCol + 1), 0, MAZE_CELL_LENGTH * (cellRow + 1)); 
    var floorPointD = vec3(MAZE_CELL_WIDTH * cellCol,       0, MAZE_CELL_LENGTH * (cellRow + 1)); 
    makeRectangle(floorPointA, floorPointB, floorPointC, floorPointD, floorColor);
    // draw walls

    var mazeCell = maze[cellRow][cellCol];
    if (mazeCell.northWall) {
        var northPointA = vec3(MAZE_CELL_WIDTH * cellCol,       0,                MAZE_CELL_LENGTH * cellRow); 
        var northPointB = vec3(MAZE_CELL_WIDTH * (cellCol + 1), 0,                MAZE_CELL_LENGTH * cellRow); 
        var northPointC = vec3(MAZE_CELL_WIDTH * (cellCol + 1), MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * cellRow); 
        var northPointD = vec3(MAZE_CELL_WIDTH * cellCol,       MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * cellRow); 
        makeRectangle(northPointA, northPointB, northPointC, northPointD, wallColor);
    } 
    if (mazeCell.eastWall) {
        var eastPointA = vec3(MAZE_CELL_WIDTH * (cellCol + 1), 0,                MAZE_CELL_LENGTH * cellRow); 
        var eastPointB = vec3(MAZE_CELL_WIDTH * (cellCol + 1), 0,                MAZE_CELL_LENGTH * (cellRow + 1)); 
        var eastPointC = vec3(MAZE_CELL_WIDTH * (cellCol + 1), MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * (cellRow + 1)); 
        var eastPointD = vec3(MAZE_CELL_WIDTH * (cellCol + 1), MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * cellRow); 
        makeRectangle(eastPointA, eastPointB, eastPointC, eastPointD, wallColor);
    }
    if (mazeCell.southWall) {
        var southPointA = vec3(MAZE_CELL_WIDTH * cellCol,       0,                MAZE_CELL_LENGTH * (cellRow + 1)); 
        var southPointB = vec3(MAZE_CELL_WIDTH * (cellCol + 1), 0,                MAZE_CELL_LENGTH * (cellRow + 1)); 
        var southPointC = vec3(MAZE_CELL_WIDTH * (cellCol + 1), MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * (cellRow + 1)); 
        var southPointD = vec3(MAZE_CELL_WIDTH * cellCol,       MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * (cellRow + 1)); 
        makeRectangle(southPointA, southPointB, southPointC, southPointD, wallColor);
    }
    if (mazeCell.westWall) {
        var westPointA = vec3(MAZE_CELL_WIDTH * cellCol, 0,                MAZE_CELL_LENGTH * cellRow); 
        var westPointB = vec3(MAZE_CELL_WIDTH * cellCol, 0,                MAZE_CELL_LENGTH * (cellRow + 1)); 
        var westPointC = vec3(MAZE_CELL_WIDTH * cellCol, MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * (cellRow + 1)); 
        var westPointD = vec3(MAZE_CELL_WIDTH * cellCol, MAZE_CELL_HEIGHT, MAZE_CELL_LENGTH * cellRow); 
        makeRectangle(westPointA, westPointB, westPointC, westPointD, wallColor);
    }

}

//take and check the current button
document.onkeydown = checkKey;

function checkKey(e) {
    e = e || window.event;

    switch (e.keyCode) {
        case 37: // left arrow - rotate left
            turnLeft();
            break;
        case 38: // up arrow - move forward, but not through walls
            goForward();
            break;
        case 39: // right arrow - rotate right
            turnRight();
            break;
        case 40: // down arrow - turn around 180 degrees
            turnAround();
            break; 
    }
}

//Get update image based on the movement of the player
function render() {
    var at0 = interpolatedAtArray.shift();
    var at1 = interpolatedAtArray.shift();
    var at2 = interpolatedAtArray.shift();
    var pp0 = interpolatedPlayerPositionArray.shift();
    var pp1 = interpolatedPlayerPositionArray.shift();
    var pp2 = interpolatedPlayerPositionArray.shift();
    if (at0 && at1 && at2 && pp0 && pp1 && pp2) {
        at = vec3(at0, at1, at2);
        playerPosition = vec3(pp0, pp1, pp2);
        update();
        window.requestAnimFrame(render);
    }
}

//update function to draw the new image
function update() {
    
	// clear the canvas with the clearing color and also clear hidden surface
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT ); 

    mvMatrix = lookAt(playerPosition, at, up);
    pMatrix = perspective(fovy, aspect, near, far);

    gl.uniformMatrix4fv( modelView, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projection, false, flatten(pMatrix) );

    var drawPrimitiveType = gl.TRIANGLES;
	var count = indices.length;                        
	gl.drawElements(drawPrimitiveType, count, gl.UNSIGNED_SHORT, 0);
}

/**initializes and loads the page */
window.onload = function init()
{
    // use the canvas created in the html
    var canvas = document.getElementById( "gl-canvas" );
    
    // setup the webGL page
    gl = WebGLUtils.setupWebGL( canvas );

    //  Configure WebGL viewport
    gl.viewport( 0, 0, canvas.width, canvas.height );
	// set sky colors
    gl.clearColor( 0.2, 0.6, 0.7, 1.0 );
	// enable hidden surface removal
    gl.enable(gl.DEPTH_TEST); 
    // get the aspect based on canvas size
    aspect =  canvas.width/canvas.height;

    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    initMaze();

    //  vertices 
    var verticesBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, verticesBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );
    var vertexPositionAttribute = gl.getAttribLocation( program, "aVertexPosition" );
	var size = 3;          // components per iteration (point dimension)
	var type = gl.FLOAT;   // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer(vertexPositionAttribute, size, type, normalize, stride, offset)
    gl.enableVertexAttribArray( vertexPositionAttribute );

	//  colors 
	var verticesColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorBuffer);
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	var vertexColorAttribute = gl.getAttribLocation( program, "aVertexColor");
	gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray( vertexColorAttribute );

    //  indices 
    var verticesIndicesBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, verticesIndicesBuffer);
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    //  matrices 
    modelView = gl.getUniformLocation( program, "modelView" );
    projection = gl.getUniformLocation( program, "projection" );

    //  lighting calculation 
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct" ), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct" ), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct" ), flatten(specularProduct));	
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition" ), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program,  "shininess" ), materialShininess);

    update();
};

