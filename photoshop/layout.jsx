#target photoshop

function jobFolder() {
    if (typeof ENGINE_JOB_DIR === "string" && ENGINE_JOB_DIR !== "") {
        return new Folder(ENGINE_JOB_DIR);
    }
    if ($.fileName) {
        return File($.fileName).parent;
    }
    throw new Error("Job folder is unknown. ENGINE_JOB_DIR was not set.");
}

function readJob() {
    var file = new File(jobFolder().fsName + "/job.json");
    if (!file.exists) throw new Error("job.json not found next to layout.jsx");
    file.open("r");
    var raw = file.read();
    file.close();
    return eval("(" + raw + ")");
}

function toJson(value) {
    if (value === null || value === undefined) return "null";
    var t = typeof value;
    if (t === "string") {
        return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n") + '"';
    }
    if (t === "number" || t === "boolean") return String(value);
    if (value instanceof Array) {
        var parts = [];
        for (var i = 0; i < value.length; i++) parts.push(toJson(value[i]));
        return "[" + parts.join(",") + "]";
    }
    var keys = [];
    for (var k in value) {
        if (value.hasOwnProperty(k)) keys.push(toJson(k) + ":" + toJson(value[k]));
    }
    return "{" + keys.join(",") + "}";
}

function writeJson(name, obj) {
    var file = new File(jobFolder().fsName + "/" + name);
    file.open("w");
    file.write(toJson(obj));
    file.close();
}

function writeResult(obj) {
    writeJson("result.json", obj);
}

function appendLog(line) {
    var file = new File(jobFolder().fsName + "/engine.log");
    file.open("a");
    file.writeln(line);
    file.close();
}

function usesFreeOffsets(parts) {
    for (var i = 0; i < parts.length; i++) {
        if (parts[i].offsetX !== 0 || parts[i].offsetY !== 0) return true;
    }
    return false;
}

function measurePng(path) {
    var file = new File(path);
    if (!file.exists) throw new Error("PNG preset not found: " + path);
    var doc = app.open(file);
    var info = { width: doc.width.value, height: doc.height.value, resolution: doc.resolution };
    doc.close(SaveOptions.DONOTSAVECHANGES);
    return info;
}

function pastePngAt(outputDoc, pngPath, x, y, layerName) {
    var pngFile = new File(pngPath);
    var pngDoc = app.open(pngFile);
    try {
        app.activeDocument = pngDoc;
        pngDoc.selection.selectAll();
        pngDoc.selection.copy();
        app.activeDocument = outputDoc;
        var layer = outputDoc.paste();
        layer.name = layerName;
        var bounds = layer.bounds;
        layer.translate(x - bounds[0].value, y - bounds[1].value);
        return layer;
    } finally {
        pngDoc.close(SaveOptions.DONOTSAVECHANGES);
    }
}

function findLayoutDocument(name) {
    var i;
    for (i = 0; i < app.documents.length; i++) {
        var doc = app.documents[i];
        if (doc.name === name || doc.name.indexOf(name) === 0) return doc;
    }
    for (i = 0; i < app.documents.length; i++) {
        if (documentHasPartLayers(app.documents[i])) return app.documents[i];
    }
    return null;
}

function documentHasPartLayers(doc) {
    for (var i = 0; i < doc.layers.length; i++) {
        if (String(doc.layers[i].name).indexOf("part:") === 0) return true;
    }
    return false;
}

function closeExistingLayout(name) {
    var existing = findLayoutDocument(name);
    if (existing) existing.close(SaveOptions.DONOTSAVECHANGES);
}

function openLayout(job) {
    var parts = job.parts || [];
    if (parts.length === 0) throw new Error("No parts to arrange.");
    var name = job.documentName || "GARMENT_LAYOUT";
    closeExistingLayout(name);

    var measured = [];
    var maxRes = 72;
    var i;
    for (i = 0; i < parts.length; i++) {
        var info = measurePng(parts[i].filePath);
        maxRes = Math.max(maxRes, info.resolution);
        measured.push({
            id: parts[i].id,
            filePath: parts[i].filePath,
            offsetX: parts[i].offsetX || 0,
            offsetY: parts[i].offsetY || 0,
            width: info.width,
            height: info.height
        });
    }

    var free = usesFreeOffsets(measured);
    var spacing = job.spacing || 5;
    var placements = [];
    if (!free) {
        var x = 0;
        for (i = 0; i < measured.length; i++) {
            if (i > 0) x += spacing;
            placements.push({ id: measured[i].id, filePath: measured[i].filePath, x: x, y: 0, width: measured[i].width, height: measured[i].height });
            x += measured[i].width;
        }
    } else {
        for (i = 0; i < measured.length; i++) {
            placements.push({
                id: measured[i].id,
                filePath: measured[i].filePath,
                x: measured[i].offsetX,
                y: measured[i].offsetY,
                width: measured[i].width,
                height: measured[i].height
            });
        }
    }

    var left = placements[0].x;
    var top = placements[0].y;
    var right = placements[0].x + placements[0].width;
    var bottom = placements[0].y + placements[0].height;
    for (i = 1; i < placements.length; i++) {
        left = Math.min(left, placements[i].x);
        top = Math.min(top, placements[i].y);
        right = Math.max(right, placements[i].x + placements[i].width);
        bottom = Math.max(bottom, placements[i].y + placements[i].height);
    }
    var docW = Math.max(1, Math.ceil(right - left));
    var docH = Math.max(1, Math.ceil(bottom - top));
    var outputDoc = app.documents.add(docW, docH, maxRes, name, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    for (i = 0; i < placements.length; i++) {
        pastePngAt(
            outputDoc,
            placements[i].filePath,
            placements[i].x - left,
            placements[i].y - top,
            "part:" + placements[i].id
        );
    }
    app.activeDocument = outputDoc;
    return { ok: true, mode: "open", documentName: outputDoc.name };
}

function captureLayout(job) {
    var name = job.documentName || "GARMENT_LAYOUT";
    var doc = findLayoutDocument(name);
    if (!doc) throw new Error("Layout document not found. Open the layout in Photoshop first.");
    app.activeDocument = doc;
    var captured = [];
    var i;
    for (i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];
        var layerName = String(layer.name);
        if (layerName.indexOf("part:") !== 0) continue;
        var partId = layerName.substring(5);
        var b = layer.bounds;
        captured.push({
            partId: partId,
            x: b[0].value,
            y: b[1].value,
            width: b[2].value - b[0].value,
            height: b[3].value - b[1].value,
            sortOrder: doc.layers.length - 1 - i
        });
    }
    if (captured.length === 0) {
        throw new Error("No part:* layers found in the Photoshop layout document.");
    }
    captured.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    var payload = { ok: true, documentName: doc.name, parts: captured };
    writeJson("positions.json", payload);
    return { ok: true, mode: "capture", documentName: doc.name, count: captured.length };
}

function main() {
    app.displayDialogs = DialogModes.NO;
    if (parseInt(app.version) < 13) {
        writeResult({ ok: false, message: "Photoshop CS6 or later is required." });
        return;
    }
    var started = new File(jobFolder().fsName + "/started.txt");
    started.open("w");
    started.write("ok");
    started.close();
    var originalUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    try {
        var job = readJob();
        appendLog("Layout " + job.mode);
        var result;
        if (job.mode === "capture") result = captureLayout(job);
        else result = openLayout(job);
        writeResult(result);
    } catch (error) {
        writeResult({ ok: false, message: String(error.message) });
    } finally {
        app.preferences.rulerUnits = originalUnits;
    }
}

main();
