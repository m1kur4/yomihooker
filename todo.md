# Todo

- [ ] text to speech button
  - [ ] ui beautify
- [ ] mine card
- [ ] count char and reading time

## Mine Card

I want you to make a navigation bar using shadcn components on the top of website which meets these requirments:
1. no matter how a scrolldown website, it always shows on top of the website
2. the navigation menu has two page to navgate, one is the original Home page in page.tsx named Text, the other is a new page named Anki, the anki page is empty for now

---

I want you to show lastest added anki note info in Anki page. Here are requirements:

### Data

1. You can get anki card data info from ankiconnect, here is api doc: https://git.sr.ht/~foosoft/anki-connect#anki-connect, all the operation is via post http of ankiconnecturl: http://127.0.0.1:8765
2. You can find last added noteid by http request with body = {"action": "findNotes","version": 6,"params": {"query": "added:1"}}, if not find card just display no recently added card
3. You can find note info by http request with body = {"action":"notesInfo","version":6,"params":{"notes":{nodeid}}}, where noteid = previous request's result

### UI

1. All the display contents is inside a NoteCard components which contains a react hook form (shadcn)
2. NoteCard components is Center horizontally
3. You need to display the following field by order: ["Expression", "Sentence", "SentenceFurigana", "SentenceAudio", "Picture"]. "SentenceAudio" and "Picture" field only display filename as text for now
4. Since this is a form, you can summit it to update anki note info, but we shall leave this function empty for now

### Tips

1. There are japanese text within these data, you need to correctly display them


`curl -X POST http://127.0.0.1:8765 \
     -H "Content-Type: application/json" \
     -d '{
           "action": "findNotes",
           "version": 6,
           "params": {
               "query": "added:1"
           }
         }'`

`curl -X POST http://localhost:8765 \
     -d '{"action": "getMediaDirPath", "version": 6}'`

`curl -X POST http://127.0.0.1:8765 \
     -H "Content-Type: application/json" \
     -d '{
           "action": "notesInfo",
           "version": 6,
           "params": {
               "notes": [1776263671404]
           }
         }'`
