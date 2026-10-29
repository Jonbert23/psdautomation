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
    if (!file.exists) throw new Error("job.json not found next to template.jsx");
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

function writeResult(obj) {
    var file = new File(jobFolder().fsName + "/result.json");
    file.open("w");
    file.write(toJson(obj));
    file.close();
}

function appendLog(line) {
    var file = new File(jobFolder().fsName + "/engine.log");
    file.open("a");
    file.writeln(line);
    file.close();
}

function solidColor(r, g, b) {
    var c = new SolidColor();
    c.rgb.red = r;
    c.rgb.green = g;
    c.rgb.blue = b;
    return c;
}

function fillRect(doc, x, y, w, h, fill) {
    var layer = doc.artLayers.add();
    layer.name = "placeholder";
    doc.activeLayer = layer;
    var x2 = x + w;
    var y2 = y + h;
    doc.selection.select([[x, y], [x2, y], [x2, y2], [x, y2]]);
    doc.selection.fill(solidColor(fill.r, fill.g, fill.b));
    doc.selection.deselect();
    return layer;
}

function generateTemplate(job) {
    var spec = job.document;
    if (!spec || !spec.groups || spec.groups.length === 0) {
        throw new Error("Template has no part groups. Add enabled parts with layer names.");
    }
    var outputPath = job.outputPath;
    if (!outputPath) throw new Error("No output path.");
    var docName = spec.documentName || "Garment template";
    var doc = app.documents.add(
        spec.width,
        spec.height,
        72,
        docName,
        NewDocumentMode.RGB,
        DocumentFill.TRANSPARENT
    );
    app.activeDocument = doc;

    var g;
    for (g = 0; g < spec.groups.length; g++) {
        var groupSpec = spec.groups[g];
        var set = doc.layerSets.add();
        set.name = groupSpec.name;
        var placeholder = fillRect(doc, groupSpec.x, groupSpec.y, groupSpec.width, groupSpec.height, groupSpec.fill);
        placeholder.move(set, ElementPlacement.INSIDE);

        var t;
        for (t = 0; t < groupSpec.texts.length; t++) {
            var textSpec = groupSpec.texts[t];
            var textLayer = set.artLayers.add();
            textLayer.kind = LayerKind.TEXT;
            textLayer.name = textSpec.name;
            var size = textSpec.size > 0 ? textSpec.size : 300;
            var x = typeof textSpec.x === "number" ? textSpec.x : groupSpec.x + groupSpec.width / 2;
            var y = typeof textSpec.y === "number" ? textSpec.y : groupSpec.y + groupSpec.height / 2;
            textLayer.textItem.contents = String(textSpec.contents);
            textLayer.textItem.size = size;
            textLayer.textItem.justification = Justification.CENTER;
            textLayer.textItem.color = solidColor(255, 255, 255);
            textLayer.textItem.position = [x, y];
        }
    }

    var outFile = new File(outputPath);
    var opt = new PhotoshopSaveOptions();
    opt.layers = true;
    opt.embedColorProfile = true;
    doc.saveAs(outFile, opt);
    if (!outFile.exists) throw new Error("Photoshop did not write the PSD file.");
    return { ok: true, mode: "generate", outputPath: outFile.fsName };
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
        appendLog("Template " + job.mode);
        writeResult(generateTemplate(job));
    } catch (error) {
        writeResult({ ok: false, message: String(error.message) });
    } finally {
        app.preferences.rulerUnits = originalUnits;
    }
}

main();
