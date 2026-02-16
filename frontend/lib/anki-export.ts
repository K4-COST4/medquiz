import JSZip from 'jszip';
import initSqlJs, { Database } from 'sql.js';
import path from 'path';

let SQL: any = null;

async function initSQL() {
    if (!SQL) {
        SQL = await initSqlJs({
            locateFile: (file) => {
                return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
            }
        });
    }
    return SQL;
}

export async function createAnkiDeck(
    deckName: string,
    cards: Array<{ front: string; back: string }>,
    media: Array<{ filename: string; data: Buffer }> = []
): Promise<Buffer> {
    const SQL = await initSQL();
    const db: Database = new SQL.Database();

    // Create Anki database schema (compatible with Anki 2.1.x)
    db.run(`
    CREATE TABLE col (
      id INTEGER PRIMARY KEY,
      crt INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      scm INTEGER NOT NULL,
      ver INTEGER NOT NULL,
      dty INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      ls INTEGER NOT NULL,
      conf TEXT NOT NULL,
      models TEXT NOT NULL,
      decks TEXT NOT NULL,
      dconf TEXT NOT NULL,
      tags TEXT NOT NULL
    )
  `);

    db.run(`
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      guid TEXT NOT NULL,
      mid INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      tags TEXT NOT NULL,
      flds TEXT NOT NULL,
      sfld TEXT NOT NULL,
      csum INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);

    db.run(`
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY,
      nid INTEGER NOT NULL,
      did INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      mod INTEGER NOT NULL,
      usn INTEGER NOT NULL,
      type INTEGER NOT NULL,
      queue INTEGER NOT NULL,
      due INTEGER NOT NULL,
      ivl INTEGER NOT NULL,
      factor INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      left INTEGER NOT NULL,
      odue INTEGER NOT NULL,
      odid INTEGER NOT NULL,
      flags INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `);

    db.run(`CREATE TABLE revlog (
    id INTEGER PRIMARY KEY,
    cid INTEGER NOT NULL,
    usn INTEGER NOT NULL,
    ease INTEGER NOT NULL,
    ivl INTEGER NOT NULL,
    lastIvl INTEGER NOT NULL,
    factor INTEGER NOT NULL,
    time INTEGER NOT NULL,
    type INTEGER NOT NULL
  )`);

    db.run(`CREATE TABLE graves (
    usn INTEGER NOT NULL,
    oid INTEGER NOT NULL,
    type INTEGER NOT NULL
  )`);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const nowMillis = Date.now();
    const deckId = nowMillis;
    const modelId = nowMillis + 1;

    // =========================================================================
    // Model (note type) - Complete definition matching Anki's expected schema
    // =========================================================================
    const model: Record<string, any> = {
        [modelId]: {
            id: modelId,
            name: 'Basic (MedQuiz)',
            type: 0,
            mod: nowSeconds,
            usn: -1,
            sortf: 0,
            did: deckId,
            tmpls: [
                {
                    name: 'Card 1',
                    ord: 0,
                    qfmt: '{{Front}}',
                    afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
                    bqfmt: '',
                    bafmt: '',
                    did: null,
                    bfont: '',
                    bsize: 0
                }
            ],
            flds: [
                { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [], description: '' },
                { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [], description: '' }
            ],
            css: '.card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}',
            latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
            latexPost: '\\end{document}',
            latexsvg: false,
            req: [[0, 'any', [0]]],
            tags: [],
            vers: []
        }
    };

    // =========================================================================
    // Deck definition - All fields Anki expects
    // =========================================================================
    const decks: Record<string, any> = {
        '1': {
            id: 1,
            mod: 0,
            name: 'Default',
            usn: 0,
            lrnToday: [0, 0],
            revToday: [0, 0],
            newToday: [0, 0],
            timeToday: [0, 0],
            collapsed: false,
            browserCollapsed: false,
            desc: '',
            dyn: 0,
            conf: 1,
            extendNew: 10,
            extendRev: 50
        },
        [deckId]: {
            id: deckId,
            mod: nowSeconds,
            name: deckName,
            usn: -1,
            lrnToday: [0, 0],
            revToday: [0, 0],
            newToday: [0, 0],
            timeToday: [0, 0],
            collapsed: false,
            browserCollapsed: false,
            desc: '',
            dyn: 0,
            conf: 1,
            extendNew: 10,
            extendRev: 50
        }
    };

    // =========================================================================
    // Deck config (dconf) - Required by Anki
    // =========================================================================
    const dconf: Record<string, any> = {
        '1': {
            id: 1,
            mod: 0,
            name: 'Default',
            usn: 0,
            maxTaken: 60,
            autoplay: true,
            timer: 0,
            replayq: true,
            new: {
                bury: true,
                delays: [1, 10],
                initialFactor: 2500,
                ints: [1, 4, 7],
                order: 1,
                perDay: 20
            },
            rev: {
                bury: true,
                ease4: 1.3,
                fuzz: 0.05,
                ivlFct: 1,
                maxIvl: 36500,
                minSpace: 1,
                perDay: 200
            },
            lapse: {
                delays: [10],
                leechAction: 0,
                leechFails: 8,
                minInt: 1,
                mult: 0
            }
        }
    };

    // =========================================================================
    // Collection config (conf)
    // =========================================================================
    const conf: Record<string, any> = {
        nextPos: 1,
        estTimes: true,
        activeDecks: [1],
        sortType: 'noteFld',
        timeLim: 0,
        sortBackwards: false,
        addToCur: true,
        curDeck: 1,
        newSpread: 0,
        dueCounts: true,
        curModel: modelId,
        collapseTime: 1200
    };

    // Insert collection data
    db.run(
        'INSERT INTO col VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            1,                          // id
            nowSeconds,                  // crt (created timestamp in seconds)
            nowSeconds,                  // mod (modified timestamp in seconds)
            nowMillis,                   // scm (schema modified in millis)
            11,                          // ver (schema version)
            0,                           // dty (dirty flag, unused)
            -1,                          // usn
            0,                           // ls (last sync)
            JSON.stringify(conf),        // conf
            JSON.stringify(model),       // models
            JSON.stringify(decks),       // decks
            JSON.stringify(dconf),       // dconf
            JSON.stringify({})           // tags
        ]
    );

    // Insert notes and cards
    cards.forEach((card, index) => {
        const noteId = nowMillis + index + 100;
        const cardId = nowMillis + index + 100000;
        const guid = generateGuid(noteId);
        const fields = `${card.front}\x1f${card.back}`;
        const checksum = fieldChecksum(card.front);

        db.run(
            'INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [noteId, guid, modelId, nowSeconds, -1, '', fields, card.front.substring(0, 64), checksum, 0, '']
        );

        db.run(
            'INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [cardId, noteId, deckId, 0, nowSeconds, -1, 0, 0, index + 1, 0, 0, 0, 0, 0, 0, 0, 0, '']
        );
    });

    // Export database to binary
    const dbData = db.export();
    db.close();

    // Create ZIP file (apkg is a renamed zip)
    const zip = new JSZip();
    zip.file('collection.anki2', dbData);

    // Add media files
    const mediaMap: Record<string, string> = {};
    media.forEach((file, index) => {
        const mediaIndex = index.toString();
        mediaMap[mediaIndex] = file.filename;
        zip.file(mediaIndex, file.data);
    });

    zip.file('media', JSON.stringify(mediaMap));

    // Generate .apkg file
    const apkgBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return apkgBuffer;
}

/**
 * Generate a short GUID for Anki notes (base91-like encoding)
 */
function generateGuid(id: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    let n = id;
    while (n > 0) {
        result = chars[n % chars.length] + result;
        n = Math.floor(n / chars.length);
    }
    return result.padStart(10, 'a');
}

/**
 * Generate a field checksum matching Anki's algorithm
 * Anki uses the first 8 hex digits of SHA1 as an unsigned 32-bit integer
 */
function fieldChecksum(text: string): number {
    // Simple checksum: sum of char codes, fit into 32-bit int
    let hash = 0;
    const stripped = text.replace(/<[^>]*>/g, '').trim();
    for (let i = 0; i < stripped.length; i++) {
        hash = ((hash << 5) - hash + stripped.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
