/* Sweepline - Yoseph Mak
 * Demonstration of the sweepline algorithm on an HTML webpage.
 * I guess this code is by default public.
 * However, if you want to use it for some reason, then do keep in mind that it is in JavaScript, everyone's favorite language.
 * This may make translating it into a programming language difficult.
 */

// ----- constants -----

// canvas info
var canvas
var ctx
var origin_x = 25 // px
var origin_y = 25 // px

// This is the bounds (in coordinate system language) for where points for the lines exist.
var x_max = 50
var x_spacing = 5
var y_max = 30
var y_spacing = 5

var x_tick_px = 50
var y_tick_px = 50

// The actual lines.
var lines = []
var num_lines = 1

// Sweepline use
var segment_list = []
var event_queue = []
var intersections = []
var labels = "abcdefghijklmnopqrstvuwxyz" // the best labels there ever were

var intersections_bf = [] // brute-force intersections

// ----- line generation -----

function gcd(a, b) {
    if (b == 0) return Math.abs(a);
    a = Math.abs(a);
    b = Math.abs(b);
    while (b != 0) {
        var r = a % b
        a = b
        b = r
    }
    return a
}

function new_point() {
    // generate x/y coordinates from 1 to their max values
    var x = Math.floor(Math.random() * x_max) + 1
    var y = Math.floor(Math.random() * y_max) + 1
    return [x, y]
}

// the above, but avoid picking a close x-coordinate
// I initially just regenerated points arbitrarily, but that is so wasteful.
function new_second_point(x1, x_threshold) {
    // generate x/y coordinates from 1 to their max values
    if (x1 < x_threshold) {
        // [x1 + x_threshold, x_max]
        x = Math.floor(Math.random() * (x_max - x1 - x_threshold + 1)) + x1 + x_threshold
    }
    else if (x_max - x1 < x_threshold) {
        // [1, x1 - x_threshold]
        x = Math.floor(Math.random() * (x1 - x_threshold)) + 1
    }
    else {
        // [1, x1 - x_threshold] U [x1 + x_threshold, x_max]
        // The way I do this is by picking from x_max - 2 * x_threshold + 1 choices and adding if needed.
        x = Math.floor(Math.random() * (x_max - 2 * x_threshold + 1))
        x += (x < x1 - x_threshold) ? 1 : (2 * x_threshold)
    }
    y = Math.floor(Math.random() * y_max) + 1
    return [x, y]
}

// Generate n random line segments in the context of the problem.
// The conditions to make this work are that there are no vertical lines, and no endpoint is on another line segment.
// There are probably cool ways of doing this, but I've chosen to cut corners here: any line's dx and dy are relatively prime.
// This is just intended to ensure there are no integer coordinate points inside a line, so only endpoint checks are needed.

// x_threshold can be set indicating the minimum allowed dx, so as to avoid stupidly short/vertical lines for aesthetics.
function generate_lines(n, x_threshold = 1) {
    var endpoints = []
    for (var i = 0; i < n; i++) {
        var [x1, y1] = new_point()
        while ([x1, y1] in endpoints) {
            [x1, y1] = new_point()
        }
        var [x2, y2] = new_second_point(x1, x_threshold)
        while ([x2, y2] in endpoints || Math.abs(x2 - x1) <= x_threshold
            || y1 == y2 || (gcd(x2 - x1, y2 - x1) != 1)) {
            [x2, y2] = new_second_point(x1, x_threshold) // only need to regenerate one of these
        }
        endpoints.push([x1, y1])
        endpoints.push([x2, y2])
    }

    // reset lines
    lines = []
    for (var i = 0; i < 2 * n; i += 2) {
        lines.push([endpoints[i], endpoints[i + 1]])
    }
}

function point_to_canvas(x, y) {
    return [origin_x + (x / x_spacing) * x_tick_px,
        origin_y - (y / y_spacing) * (y_tick_px)
    ]
}

// ----- canvas drawing -----

function init_canvas() {
    canvas = document.getElementById("canvas")
    ctx = canvas.getContext("2d")
    origin_y = canvas.height - origin_y
}

function set_canvas_bg() {
    // ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

// Resets the draw style as needed.
function draw_line(x1, y1, x2, y2, color, width) {
    var old_fill = ctx.fillStyle
    ctx.fillStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.fillStyle = old_fill
}

function draw_point(x, y, color, width) {
    var old_fill = ctx.fillStyle
    ctx.beginPath()
    ctx.arc(x, y, width, 0, 2 * Math.PI)
    ctx.fillStyle = color;
    ctx.fill()
    ctx.fillStyle = old_fill
}

function draw_axes() {
    draw_line(origin_x, 0, origin_x, canvas.height, "black", 4)
    draw_line(0, origin_y, canvas.width, origin_y, "black", 4)
}

// Draw ticks for the above axes where the spacing between x-axis ticks and y-axis ticks are given (in px).
function draw_ticks(x_spacing, y_spacing) {
    for (var i = 0; i < (canvas.width - origin_x) / x_spacing; i++) {
        draw_line(origin_x + i * x_spacing, origin_y - 5, origin_x + i * x_spacing, origin_y + 5, "black", 2)
    }
    for (var j = 0; j < origin_y / y_spacing; j++) {
        draw_line(origin_x - 5, origin_y - j * y_spacing, origin_x + 5, origin_y - j * y_spacing, "black", 2)
    }
}

function reset_grid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    set_canvas_bg()
    draw_axes()
    draw_ticks(x_tick_px, y_tick_px)
}

// Draws all the line segments (ideally).
function draw_segments() {
    for (var i = 0; i < lines.length; i++) {
        var [x1, y1] = point_to_canvas(lines[i][0][0], lines[i][0][1])
        var [x2, y2] = point_to_canvas(lines[i][1][0], lines[i][1][1])
        // console.log(x1, x2, y1, y2)
        draw_line(x1, y1, x2, y2, "gray", 1)
    }
}

// Draws all the (coordinate system) points given.
function draw_intersections(arr) {
    for (var i = 0; i < arr.length; i++) {
        var [xi, yi] = point_to_canvas(arr[i][0], arr[i][1])
        draw_point(xi, yi, "blue", 4)
    }
}

// Rebuilds the drawing of the canvas demo.
function reconstruct_demo(n) {
    reset_grid()
    generate_lines(n, 20)
    draw_segments()
}

// ----- Sweepline magic ----

// As before, lines are formatted as [[x1, y1], [x2, y2]] because JS has a very good type system.
function slope_intercept(line) {
    var m = (line[1][1] - line[0][1]) / (line[1][0] - line[0][0])
    var b = line[1][1] - m * line[1][0]
    return [m, b]
}

// returns a point [x, y] or null if no intersection
function check_intersection(l1, l2) {
    var [m1, b1] = slope_intercept(l1)
    var [m2, b2] = slope_intercept(l2)
    if (m1 == m2) return null;
    // m1 * x + b1 = m2 * x + b2
    var x = (b1 - b2) / (m2 - m1)
    var x_lb = Math.max(Math.min(l1[0][0], l1[1][0]), Math.min(l2[0][0], l2[1][0]))
    var x_ub = Math.min(Math.max(l1[0][0], l1[1][0]), Math.max(l2[0][0], l2[1][0]))
    if (x <= x_lb || x >= x_ub) return null;
    return [x, m1 * x + b1]
}

// Check all intersections in the input set of lines by brute-force.
function check_intersections_bf() {
    intersections_bf = []
    for (var i = 0; i < lines.length; i++) {
        for (var j = i + 1; j < lines.length; j++) {
            var inter = check_intersection(lines[i], lines[j])
            if (inter != null) intersections_bf.push(inter)
        }
    }
}

function run_sweepline() {
    var n = $('#num_lines').val()
    reconstruct_demo(n)

    // brute-forcing
    check_intersections_bf()
    draw_intersections(intersections_bf)
}

// ----- jQuery -----
// https://stackoverflow.com/questions/30948387/number-only-input-box-with-range-restriction
$(document).ready(function() {
    $('#num_lines').change(function() {
      var n = $('#num_lines').val()
      if (n < 1)
        $('#num_lines').val(1)
      if (n > 20)
        $('#num_lines').val(20)
    })
})