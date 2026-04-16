# Todo

## Folder View

Now, i want to have a many textDecks in "/" path, you can click these deck and can get into "/{decktname}" path where are the messages list as like current "/" path's comtents. Here are more details:

1. Each textdeck in "/" path is clickalbe rectangle with size 200 x 200 and have a cover picture, when mouse hover in. a "More" button with shadcn Dropdown Menu will appear in the upper right corner.  Dropdown Menu have the following item: Rename, Change Cover, Delete
2. These decks are arranged in a grid. There is an add icon button following the last one, it's function is to create new deck, when click will show up a shadcn Dialog, let user input deck name and upload cover picture from disk
3. In "/{decktname}" path page, contents is same as current project's deck components, expect besides adding a path bar, under the top navbar. This path bar using https://ui.shadcn.com/docs/components/radix/breadcrumb to show clikable path routing
4. Let's Mirate the current messages into a new Deck, deckname = 魔法使いの夜， cover = https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzVcmxmssTGFK_mrEOsxUL7loX8xOMgVs0_5RFPQ8n2vyuxiFMXE0BIIWWD6qJjN4fWIrKSg&s=10