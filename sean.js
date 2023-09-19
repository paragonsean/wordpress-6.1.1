import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').then(async () => {
  alert('This is the McGraw-Hill Education Textbook Downloader. Click OK to start downloading the files.');

  const IMPORT_URL = (await (await fetch('https://player-api.mheducation.com/lti', { credentials: 'include' })).json()).custom_epub_url;
  const epub = new JSZip();
  const metaInf = epub.folder('META-INF');
  metaInf.file('container.xml', await (await fetch(IMPORT_URL + 'META-INF/container.xml', { credentials: 'include' })).text());

  const epubData = epub.folder('OPS');
  const opfString = await (await fetch(IMPORT_URL + 'OPS/content.opf', { credentials: 'include' })).text();
  epubData.file('content.opf', opfString);

  const opf = new DOMParser().parseFromString(opfString, 'application/xml');

  // Open IndexedDB
  const dbRequest = indexedDB.open("EpubDatabase", 1);
  dbRequest.onupgradeneeded = function(event) {
    const db = event.target.result;
    db.createObjectStore("Files");
  };

  dbRequest.onsuccess = async function(event) {
    const db = event.target.result;
    let counter = 0;

    for (let item of opf.querySelector('manifest').children) {
      if (counter >= 40000) {
        break; // Stop after 1000 files
      }

      const href = item.getAttribute('href');
      try {
        const response = await fetch(`${IMPORT_URL}OPS/${href}`, { credentials: 'include' });
        const data = await response.arrayBuffer();

        // Save data to IndexedDB
        const transaction = db.transaction(["Files"], "readwrite");
        const store = transaction.objectStore("Files");
        store.put(data, href);

        console.log('Finished downloading', href);
      } catch(e) {
        throw `Failed to download ${href}: ${e}`;
      }
      counter++;
    }

    alert('Finished downloading data! Click OK to start compression.');

    // Retrieve data from IndexedDB and add to JSZip
    const transaction = db.transaction(["Files"], "readonly");
    const store = transaction.objectStore("Files");
    const request = store.getAll();

    request.onsuccess = async function(event) {
      const files = event.target.result;
      files.forEach((fileData, index) => {
        epubData.file(opf.querySelector('manifest').children[index].getAttribute('href'), fileData);
      });

      const data = await epub.generateAsync({ type: 'blob' });
      window.__savedTextbookEpub = data;
      const url = URL.createObjectURL(data);
      const tmpLink = document.createElement('a');
      tmpLink.href = url;
      const possibleTitle = opf.querySelector('metadata title');
      const titleString = possibleTitle ? possibleTitle.innerHTML : 'textbook';
      tmpLink.download = titleString + '.epub';
      tmpLink.click();
      URL.revokeObjectURL(url);
    };
  };

  dbRequest.onerror = function(event) {
    alert('Database error: ' + event.target.errorCode);
  };
}).catch(err => alert('Textbook download failed because an error occurred: '+err));

