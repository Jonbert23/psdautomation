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
    if (!file.exists) throw new Error("job.json not found next to engine.jsx");
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

function findLayerByName(parent, layerName) {
    for (var i = 0; i < parent.layers.length; i++) {
        var layer = parent.layers[i];
        if (layer.name === layerName) return layer;
        if (layer.typename === "LayerSet") {
            var found = findLayerByName(layer, layerName);
            if (found) return found;
        }
    }
    return null;
}

function findAndEditText(doc, layerName, newText) {
    var layer = findLayerByName(doc, layerName);
    if (!layer) return false;
    if (layer.kind === LayerKind.TEXT) {
        layer.textItem.contents = String(newText);
        return true;
    }
    return false;
}

function applyAttributes(doc, profile, values) {
    for (var a = 0; a < profile.attributes.length; a++) {
        var attr = profile.attributes[a];
        var mapping = attr.mapping;
        if (!mapping || !mapping.layerName) continue;
        var value = values[attr.id];
        if (value === undefined || value === null) value = "";
        var names = String(mapping.layerName).split(",");
        for (var n = 0; n < names.length; n++) {
            var layerName = names[n].replace(/^\s+|\s+$/g, "");
            if (!layerName) continue;
            if (attr.type === "checkbox") {
                var vis = findLayerByName(doc, layerName);
                if (vis) vis.visible = value === true || value === "true" || value === 1;
            } else if (attr.type === "image") {
                if (String(value) !== "") {
                    throw new Error("Image attribute '" + attr.displayName + "' is not applied in this engine yet.");
                }
            } else {
                findAndEditText(doc, layerName, value);
            }
        }
    }
}

function mergePartGroups(doc, profile) {
    for (var i = 0; i < profile.parts.length; i++) {
        var part = profile.parts[i];
        if (!part.enabled) continue;
        var group = findLayerByName(doc, part.photoshopLayer);
        if (group && group.typename === "LayerSet") {
            app.activeDocument = doc;
            app.activeDocument.activeLayer = group;
            try {
                group.merge();
            } catch (e) {}
        }
    }
}

function matchLayerToReference(pastedLayer, referenceLayer) {
    app.activeDocument.activeLayer = pastedLayer;
    var refBounds = referenceLayer.bounds;
    var refWidth = refBounds[2].value - refBounds[0].value;
    var refHeight = refBounds[3].value - refBounds[1].value;
    var refCenterX = refBounds[0].value + (refWidth / 2);
    var refCenterY = refBounds[1].value + (refHeight / 2);
    var pastedBounds = pastedLayer.bounds;
    var pastedWidth = pastedBounds[2].value - pastedBounds[0].value;
    var pastedHeight = pastedBounds[3].value - pastedBounds[1].value;
    if (pastedWidth <= 0 || pastedHeight <= 0) throw new Error("Pasted artwork has no size.");
    if (refWidth <= 0 || refHeight <= 0) throw new Error("PNG preset has no size.");
    var scaleX = refWidth / pastedWidth;
    var scaleY = refHeight / pastedHeight;
    var mode = "stretch";
    pastedLayer.resize(scaleX * 100, scaleY * 100, AnchorPosition.MIDDLECENTER);
    var newBounds = pastedLayer.bounds;
    var newCenterX = newBounds[0].value + ((newBounds[2].value - newBounds[0].value) / 2);
    var newCenterY = newBounds[1].value + ((newBounds[3].value - newBounds[1].value) / 2);
    pastedLayer.translate(refCenterX - newCenterX, refCenterY - newCenterY);
}

function findPresetPath(profile, sizeId, partId) {
    for (var i = 0; i < profile.presetAssignments.length; i++) {
        var a = profile.presetAssignments[i];
        if (a.sizeId === sizeId && a.partId === partId && a.filePath) return a.filePath;
    }
    return null;
}

function processItem(job, item) {
    var profile = job.profile;
    var designFile = new File(job.designTemplatePath);
    if (!designFile.exists) throw new Error("Design file not found");
    var doc = app.open(designFile);
    var outputDoc = null;
    try {
        applyAttributes(doc, profile, item.attributeValues || {});
        mergePartGroups(doc, profile);

        var parts = [];
        for (var p = 0; p < profile.parts.length; p++) {
            if (profile.parts[p].enabled) parts.push(profile.parts[p]);
        }
        parts.sort(function (a, b) { return a.sortOrder - b.sortOrder; });

        var spacing = 5;
        var maxRes = 72;
        var workParts = [];
        var freeLayout = false;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part.offsetX !== 0 || part.offsetY !== 0) freeLayout = true;
            var pngPath = findPresetPath(profile, item.sizeId, part.id);
            if (!pngPath) {
                if (part.required) throw new Error("No PNG preset for part " + part.name);
                continue;
            }
            var pngFile = new File(pngPath);
            if (!pngFile.exists) throw new Error("PNG preset not found: " + pngPath);
            var srcLayer = findLayerByName(doc, part.photoshopLayer);
            if (!srcLayer) {
                if (part.required) throw new Error("Layer '" + part.photoshopLayer + "' not found in the design file.");
                continue;
            }
            var measureDoc = app.open(pngFile);
            var pngW = measureDoc.width.value;
            var pngH = measureDoc.height.value;
            maxRes = Math.max(maxRes, measureDoc.resolution);
            measureDoc.close(SaveOptions.DONOTSAVECHANGES);
            workParts.push({ part: part, pngPath: pngPath, srcLayer: srcLayer, pngW: pngW, pngH: pngH, x: 0, y: 0 });
        }

        if (workParts.length === 0) throw new Error("No garment parts were placed.");

        if (!freeLayout) {
            var xCursor = 0;
            for (var i = 0; i < workParts.length; i++) {
                if (i > 0) xCursor += spacing;
                workParts[i].x = xCursor;
                workParts[i].y = 0;
                xCursor += workParts[i].pngW;
            }
        } else {
            for (var i = 0; i < workParts.length; i++) {
                workParts[i].x = workParts[i].part.offsetX || 0;
                workParts[i].y = workParts[i].part.offsetY || 0;
            }
        }

        var left = workParts[0].x;
        var top = workParts[0].y;
        var right = workParts[0].x + workParts[0].pngW;
        var bottom = workParts[0].y + workParts[0].pngH;
        for (var i = 1; i < workParts.length; i++) {
            left = Math.min(left, workParts[i].x);
            top = Math.min(top, workParts[i].y);
            right = Math.max(right, workParts[i].x + workParts[i].pngW);
            bottom = Math.max(bottom, workParts[i].y + workParts[i].pngH);
        }
        var totalW = Math.max(1, Math.ceil(right - left));
        var maxH = Math.max(1, Math.ceil(bottom - top));
        outputDoc = app.documents.add(totalW, maxH, maxRes, "GARMENT_OUTPUT", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

        for (var i = 0; i < workParts.length; i++) {
            var part = workParts[i].part;
            var pngFile = new File(workParts[i].pngPath);
            var srcLayer = workParts[i].srcLayer;
            var placeX = workParts[i].x - left;
            var placeY = workParts[i].y - top;

            var pngDoc = app.open(pngFile);
            try {
                app.activeDocument = pngDoc;
                pngDoc.selection.selectAll();
                pngDoc.selection.copy();
                app.activeDocument = outputDoc;
                var refLayer = outputDoc.paste();
                refLayer.name = part.photoshopLayer + "_ref";
                var refBounds = refLayer.bounds;
                refLayer.translate(placeX - refBounds[0].value, placeY - refBounds[1].value);

                app.activeDocument = doc;
                app.activeDocument.activeLayer = srcLayer;
                srcLayer.copy();
                app.activeDocument = outputDoc;
                var pasted = outputDoc.paste();
                pasted.name = part.photoshopLayer + "_customized";
                matchLayerToReference(pasted, refLayer);
                if (part.clippingMask) {
                    refLayer.move(pasted, ElementPlacement.PLACEAFTER);
                    app.activeDocument.activeLayer = pasted;
                    pasted.grouped = true;
                }
            } finally {
                pngDoc.close(SaveOptions.DONOTSAVECHANGES);
            }
        }

        var outPaths = saveOutputs(outputDoc, job, item);
        outputDoc.close(SaveOptions.DONOTSAVECHANGES);
        doc.close(SaveOptions.DONOTSAVECHANGES);
        return { id: item.id, ok: true, outputPaths: outPaths };
    } catch (error) {
        try { if (outputDoc) outputDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (e1) {}
        try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
        throw error;
    }
}

function saveOutputs(doc, job, item) {
    var folder = job.outputFolder;
    var name = item.fileName || "garment";
    var ex = job.exportFormats || {};
    var paths = [];
    app.activeDocument = doc;
    if (ex.savePsd) {
        var psd = new File(folder + "/" + name + ".psd");
        var psdOptions = new PhotoshopSaveOptions();
        psdOptions.layers = true;
        psdOptions.embedColorProfile = true;
        doc.saveAs(psd, psdOptions);
        paths.push(psd.fsName);
    }
    if (ex.savePng) {
        var png = new File(folder + "/" + name + ".png");
        var pngOpt = new ExportOptionsSaveForWeb();
        pngOpt.format = SaveDocumentType.PNG;
        pngOpt.PNG8 = false;
        pngOpt.transparency = true;
        doc.exportDocument(png, ExportType.SAVEFORWEB, pngOpt);
        paths.push(png.fsName);
    }
    if (ex.saveJpg) {
        var jpg = new File(folder + "/" + name + ".jpg");
        var jpgOpt = new JPEGSaveOptions();
        jpgOpt.quality = ex.jpgQuality || 10;
        jpgOpt.embedColorProfile = true;
        doc.saveAs(jpg, jpgOpt, true, Extension.LOWERCASE);
        paths.push(jpg.fsName);
    }
    if (paths.length === 0) {
        var fallback = new File(folder + "/" + name + ".psd");
        var opt = new PhotoshopSaveOptions();
        opt.layers = true;
        doc.saveAs(fallback, opt);
        paths.push(fallback.fsName);
    }
    return paths;
}

function main() {
    app.displayDialogs = DialogModes.NO;
    if (parseInt(app.version) < 13) {
        writeResult({ ok: false, message: "Photoshop CS6 or later is required.", items: [] });
        return;
    }
    var started = new File(jobFolder().fsName + "/started.txt");
    started.open("w");
    started.write("ok");
    started.close();
    var originalUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    var itemsOut = [];
    var ok = true;
    try {
        var job = readJob();
        appendLog("Job " + job.jobId);
        for (var i = 0; i < job.items.length; i++) {
            var item = job.items[i];
            try {
                appendLog("Item " + item.id);
                itemsOut.push(processItem(job, item));
            } catch (itemErr) {
                ok = false;
                appendLog("FAIL " + item.id + ": " + itemErr.message);
                itemsOut.push({ id: item.id, ok: false, message: String(itemErr.message) });
            }
        }
        writeResult({ ok: ok, items: itemsOut });
    } catch (error) {
        writeResult({ ok: false, message: String(error.message), items: itemsOut });
    } finally {
        app.preferences.rulerUnits = originalUnits;
    }
}

main();
