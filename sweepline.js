/**
 * Sweepline - Yoseph Mak (symbolic23)
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
var x_max = 75
var x_spacing = 5
var y_max = 28
var y_spacing = 5

var x_tick_px = 50
var y_tick_px = 50

var horizontal = 20; // min horizontal distance between points in line segments

// The actual lines.
var lines = []
var num_lines = 1

// Sweepline use
var segment_list = []
var event_queue = []
var intersections = []
var labels = "abcdefghijklmnopqrstvuwxyz" // the best labels there ever were
var current_x = -100
var current_event = null

var intersections_bf = [] // brute-force intersections
var key_lines = [] // highlight some lines

// ----- useful functions -----

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

// https://stackoverflow.com/questions/15762768/javascript-math-round-to-two-decimal-places
function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

/**
 * Return 0 <= i <= array.length such that !pred(array[i - 1]) && pred(array[i]).
 * https://stackoverflow.com/questions/22697936/binary-search-in-javascript
 */
function binarySearch(array, pred) {
    let lo = -1, hi = array.length;
    while (1 + lo < hi) {
        var mi = lo + ((hi - lo) >> 1);
        if (pred(array[mi])) {
            hi = mi;
        } else {
            lo = mi;
        }
    }
    return hi;
}

// comparator: comp(a, b) => a < b (basically)
// return the index
function find_place(arr, comp, e) {
    var i = binarySearch(arr, x => comp(e, x))
    return i
}

// comparator: comp(a, b) => a < b (basically)
// return the index where it was inserted
// does not insert if the element already exists
function insert_into(arr, comp, e) {
    var i = binarySearch(arr, x => comp(e, x))
    arr.splice(i, 0, e)
    return i
}

// deletion, if the element exists
function delete_from(arr, comp, e) {
    var i = binarySearch(arr, x => comp(e, x))
    if (arr[i] == e) {
        arr.splice(i, 1)
        return i
    }
    return -1
}

// ----- line generation -----

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
        // insert left to right
        if (x1 < x2) endpoints.push([x1, y1], [x2, y2])
        else endpoints.push([x2, y2], [x1, y1])
    }

    // reset lines
    lines = []
    for (var i = 0; i < 2 * n; i += 2) {
        lines.push([endpoints[i], endpoints[i + 1]])
    }

    // sort lines
    lines.sort(compare_lines)
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
function draw_line(x1, y1, x2, y2, color = "black", width = 1) {
    var old_fill = ctx.fillStyle
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.fillStyle = old_fill
}

function draw_point(x, y, color = "black", width = 1) {
    var old_fill = ctx.fillStyle
    ctx.beginPath()
    ctx.arc(x, y, width, 0, 2 * Math.PI)
    ctx.fillStyle = color
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
    // draw_ticks(x_tick_px, y_tick_px)
}

// Draws all the line segments (ideally).
function draw_segments() {
    for (var i = 0; i < lines.length; i++) {
        var [x1, y1] = point_to_canvas(lines[i][0][0], lines[i][0][1])
        var [x2, y2] = point_to_canvas(lines[i][1][0], lines[i][1][1])
        draw_line(x1, y1, x2, y2, "gray", 1)
    }
    for (var j = 0; j < key_lines.length; j++) {
        var [x1, y1] = point_to_canvas(lines[key_lines[j]][0][0], lines[key_lines[j]][0][1])
        var [x2, y2] = point_to_canvas(lines[key_lines[j]][1][0], lines[key_lines[j]][1][1])
        draw_line(x1, y1, x2, y2, "gray", 2)
    }
}

// Draws all the (coordinate system) points given by arr.
function draw_intersections(arr, color, width = 1) {
    for (var i = 0; i < arr.length; i++) {
        var [xi, yi] = point_to_canvas(arr[i][0], arr[i][1])
        draw_point(xi, yi, color, width)
    }
}

// Rebuilds the demo with new lines and draws it in.
function reconstruct_demo(n) {
    reset_grid()
    generate_lines(n, horizontal)
    draw_segments()
}

// Resets the demo using the current set of lines.
// Good in case you make a mistake while presenting this demo. I mean, what?
function soft_reset() {
    reset_grid()
    draw_segments()
}

// Assumes everything is in place to be drawn.
function redraw_sweepline_grid() {
    reset_grid()
    draw_segments()
    var current_x_px = origin_x + (current_x / x_spacing) * x_tick_px

    if (document.getElementById("brute_force").checked) draw_intersections(intersections_bf, "blue", 3)
    draw_intersections(intersections, "red", 4)

    // the sweep line
    // segment list labels may be in order
    if (document.getElementById("sl_button").checked) {
        var label_y = origin_y - (y_max / y_spacing) * y_tick_px;
        draw_line(current_x_px, origin_y, current_x_px, label_y, "green", 1)
        
        ctx.font = "12px Arial"
        ctx.fillStyle = "green"
        ctx.textAlign = "center"
        label_y -= 10
        for (var i = segment_list.length - 1; i >= 0; i--) {
            ctx.fillText(labels[segment_list[i]], current_x_px, label_y)
            label_y -= 12
        }
    }
    else {
        draw_line(current_x_px, origin_y, current_x_px, 0, "green", 1)
    }

    var [ex, ey] = get_event_point(current_event)
    var ex_px = origin_x + (ex / x_spacing) * x_tick_px
    var ey_px = origin_y - (ey / y_spacing) * y_tick_px
    draw_point(ex_px, ey_px, "green", 4)
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
    for (var i = 0; i < lines.length; i++) {
        for (var j = i + 1; j < lines.length; j++) {
            var inter = check_intersection(lines[i], lines[j])
            if (inter != null) intersections_bf.push(inter)
        }
    }
}

function generate_problem() {
    reset_sweepline()
    var n = $('#num_lines').val()
    reconstruct_demo(n)
    init_sweepline()
    update_sweepline_divs()
}

function reset_algorithm() {
    reset_sweepline()
    init_sweepline()
    redraw_sweepline_grid()
    update_sweepline_divs()
}

function reset_sweepline() {
    segment_list = []
    event_queue = []
    intersections = []
    intersections_bf = []
    key_lines = []
    current_event = null
}

/**
 * Event format:
 * [x, "enter"/"leave"/"intersection", i, (j for intersection), (intersection coords)]
 * Segment list will just use indices.
 */

// priority: enter before intersection before leave
function compare_events(a, b) {
    if (a[0] != b[0]) return a[0] < b[0]
    return a[1] <= b[1] // convenient string hack
}

// compare lines by left point
function compare_lines(a, b) {
    if (a[0][0] != b[0][0]) return a[0][0] - b[0][0]
    return a[0][1] - b[0][1]
}

function init_sweepline() {
    reset_sweepline()
    check_intersections_bf()
    if (document.getElementById("brute_force").checked) {
        // draw brute-force choices
        draw_intersections(intersections_bf, "blue", 3)
    }

    // insert events into the queue
    for (var i = 0; i < lines.length; i++) {
        insert_into(event_queue, compare_events, [lines[i][0][0], "enter", i])
        insert_into(event_queue, compare_events, [lines[i][1][0], "exit", i])
    }

    current_x = -100
}

// Get the point in coordinates where the event takes place
function get_event_point(evt) {
    if (evt == null) return [100, 100]
    if (evt[1] == "enter") {
        return lines[evt[2]][0]
    }
    else if (evt[1] == "exit") {
        return lines[evt[2]][1]
    }
    else if (evt[1] == "intersection") {
        return evt[4]
    }
}

// Run a single step of the event queue.
// Good for demonstration purposes.
function step_sweepline() {
    if (event_queue.length == 0) {
        current_x = 100
        current_event = null
        key_lines = []
        redraw_sweepline_grid()
        update_sweepline_divs()
        return
    }

    // debug
    console.log(event_queue)
    console.log(segment_list)

    var evt = event_queue[0]
    current_event = evt
    event_queue.splice(0, 1)

    console.log("Processing " + evt)

    // compare lines of index i, j SL style
    // format is top-to-bottom
    current_x = evt[0] // for safety in intersection checking
    function compare_SL(i, j) {
        var [m1, b1] = slope_intercept(lines[i])
        var [m2, b2] = slope_intercept(lines[j])
        var y1 = (m1 * current_x + b1)
        var y2 = (m2 * current_x + b2)
        if (Math.abs(y2, y1) <= 0.0005) {
            // intersection floating point nonsense
            return m1 >= m2
        }
        return y1 >= y2
    }

    key_lines = (evt[1] == "intersection") ? [evt[2], evt[3]] : [evt[2]]

    // assume i < j
    function check_and_insert(i, j) {
        var inter = check_intersection(lines[i], lines[j])
        if (inter != null && inter[0] > current_x) {
            var int_event = [inter[0], "intersection", i, j, inter]
            // Verify that this event doesn't already exist
            var loc = find_place(event_queue, compare_events, int_event)
            if (event_queue[loc][2] == i && event_queue[loc][3] == j) return
            insert_into(event_queue, compare_events,
                    [inter[0], "intersection", i, j, inter])
        }
    }
    
    if (evt[1] == "enter") {
        var sl_index = insert_into(segment_list, compare_SL, evt[2])
        var current = evt[2]
        if (sl_index != 0) {
            var previous = segment_list[sl_index - 1]
            check_and_insert(previous, current)
        }
        if (sl_index != segment_list.length - 1) {
            var next = segment_list[sl_index + 1]
            check_and_insert(current, next)
        }
    }
    else if (evt[1] == "exit") {
        var sl_index = delete_from(segment_list, compare_SL, evt[2])
        if (0 < sl_index && sl_index < segment_list.length) {
            var previous = segment_list[sl_index - 1]
            var next = segment_list[sl_index]
            check_and_insert(previous, next)
        }
    }
    else if (evt[1] == "intersection") {
        var sl1 = find_place(segment_list, compare_SL, evt[2])
        var sl2 = find_place(segment_list, compare_SL, evt[3])

        // annoying floating-point checks for fixing the location of intersections
        if (segment_list[sl1] == evt[2]) {
            sl2 = sl1 + 1
        }
        else if (segment_list[sl1] == evt[3]) {
            sl1 = sl2
            sl2 = sl1 + 1
        }
        else if (segment_list[sl2] == evt[2]) {
            sl1 = sl2
            sl2 = sl1 + 1
        }
        else if (segment_list[sl2] == evt[3]) {
            sl1 = sl2 - 1
        }
        else {
            console.log("Intersection locations don't seem adjacent: " + sl1 + ", " + sl2)
        }
        
        segment_list[sl2] = evt[2]
        segment_list[sl1] = evt[3]
        intersections.push(evt[4])

        if (sl1 != 0) {
            var previous = segment_list[sl1 - 1]
            var current_left = segment_list[sl1]
            check_and_insert(previous, current_left)
        }
        if (sl2 != segment_list.length - 1) {
            var current_right = segment_list[sl2]
            var next = segment_list[sl2 + 1]
            check_and_insert(current_right, next)
        }
    }

    redraw_sweepline_grid() // necessary drawing command
    update_sweepline_divs()
}

function run_sweepline() {
    // While the queue isn't empty...
    while (event_queue.length > 0) {
        step_sweepline()
    }
}

// ----- HTML interaction -----

function event_str(evt) {
    if (evt == null) return "-"
    var res = "" // "x = " + round(evt[0], 3)
    if (evt[1] == "enter") {
        res += "Line " + labels[evt[2]] + " starts"
    }
    else if (evt[1] == "exit") {
        res += "Line " + labels[evt[2]] + " ends"
    }
    else if (evt[1] == "intersection") {
        res += "Lines " + labels[evt[2]] + " and " + labels[evt[3]] + " intersect"
    }
    return res
}

function update_current_event_div() {
    document.getElementById("current_event").innerHTML = "Current event: " + event_str(current_event)
}

function update_intersection_ct_div() {
    var intersection_text = "Intersections found: " + intersections.length
    var bf_addition = document.getElementById("brute_force").checked ? " / " + intersections_bf.length : ""
    document.getElementById("total_intersections").innerHTML = intersection_text + bf_addition
}

function update_event_queue_div() {
    if (!document.getElementById("eq_button").checked) {
        document.getElementById("event_queue").innerHTML = ""
        return
    }
    if (event_queue.length == 0) {
        document.getElementById("event_queue").innerHTML = "Event queue: -"
        return
    }

    var eq_open = "Event queue:\n<ul>\n"
    var eq_close = "</ul>"

    var eq_inner = ""
    for (var i = 0; i < event_queue.length; i++) {
        eq_inner += "<li>" + event_str(event_queue[i]) + "</li>\n"
    }
    document.getElementById("event_queue").innerHTML = eq_open + eq_inner + eq_close
}

function update_segment_list_display() {

}

function update_sweepline_divs() {
    update_current_event_div()
    update_intersection_ct_div()
    update_event_queue_div()
    update_segment_list_display()
}

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

$(document).ready(function() {
    $('#brute_force').change(function() {
        redraw_sweepline_grid() // necessary drawing command
        update_intersection_ct_div()
    })
})

$(document).ready(function() {
    $('#eq_button').change(function() {
        update_event_queue_div()
    })
})

$(document).ready(function() {
    $('#sl_button').change(function() {
        redraw_sweepline_grid() // necessary drawing command
        update_segment_list_display()
    })
})