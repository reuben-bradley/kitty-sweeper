
const FLAG_IMG_SRC = '/images/flag_red.png';
const CAT_IMG_SRC = '/images/white-kitty.png';
const CAT_INCORRECT_IMG_SRC = '/images/no-kitty.png';
const DEFAULTS = {
    easy: {
        colCount: 9,
        rowCount: 9,
        kittyCount: 10
    },
    medium: {
        colCount: 16,
        rowCount: 16,
        kittyCount: 40
    },
    hard: {
        colCount: 16,
        rowCount: 30,
        kittyCount: 99
    }
};

// TODO:
//  - implement double-click on cleared buttons?

const GameBoard = {
    colCount: 10,
    rowCount: 15,
    kittyCount: 8,
    resolveQueue: [],

    init: function () {
        this.gameGrid = document.getElementById('game-grid');
        // Setup the event listeners on the game won/lost buttons
        document.querySelector('#game-lost-popup button.btn-negative').addEventListener('click', () => {
            this.hidePopup(document.getElementById('game-lost-popup'));
        });
        document.querySelector('#game-lost-popup button.btn-affirmative').addEventListener('click', () => {
            this.hidePopup(document.getElementById('game-lost-popup'));
            this.gameStart();
        })
        document.querySelector('#game-won-popup button.btn-negative').addEventListener('click', () => {
            this.hidePopup(document.getElementById('game-won-popup'));
        });
        document.querySelector('#game-won-popup button.btn-affirmative').addEventListener('click', () => {
            this.hidePopup(document.getElementById('game-won-popup'));
            this.gameStart();
        });
        // Setup the event listener on other UI elements
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.gameStart();
        });

        this.gameStart();
    },

    configure: function () {
        // First, determine what difficulty has been selected (default is "easy")
        let difficulties = document.getElementsByName('difficulty');
        let mode;
        for ( let x = 0, ln = difficulties.length; x < ln; x++ ) {
            if ( difficulties[x].checked ) {
                // Found the selected mode!
                mode = difficulties[x].value;
                break;
            }
        }

        if ( mode == 'custom' ) {
            // Parse the custom values, defaulting to easy if they've not been set
            this.colCount = parseInt(document.getElementById('customCols').value) || DEFAULTS.easy.colCount;
            this.rowCount = parseInt(document.getElementById('customRows').value) || DEFAULTS.easy.rowCount;
            this.kittyCount = parseInt(document.getElementById('customKitties').value) || DEFAULTS.easy.kittyCount;
        }
        else {
            this.colCount = DEFAULTS[mode].colCount;
            this.rowCount = DEFAULTS[mode].rowCount;
            this.kittyCount = DEFAULTS[mode].kittyCount;
        }
        this.gridCount = this.colCount * this.rowCount;
        // Make sure we're not trying to place more kitties than there are cells
        if ( this.kittyCount > this.gridCount ) {
            this.kittyCount = this.gridCount;
            document.getElementById('customKitties').value = this.kittyCount;
        }
        this.gameGrid.style.setProperty('--col-count', this.colCount);
        this.gameGrid.style.setProperty('--row-count', this.rowCount);
    },

    gameStart: function () {
        // Clear the game grid
        while ( this.gameGrid.firstChild ) {
            this.gameGrid.removeChild(this.gameGrid.firstChild);
        }
        // Configure the game board
        this.configure();
        this.kittyCells = [];

        //let btnEl;
        for ( let i = 0; i < this.gridCount; i++ ){
            let btnEl = document.createElement('button');
            btnEl.setAttribute('name', 'button-' + i);
            btnEl.dataset.cellId = i;
            btnEl.classList.add('kitty-space');
            btnEl.addEventListener('click', () => { this.handleCellClick(btnEl); });
            btnEl.addEventListener('contextmenu', ( ev ) => { ev.preventDefault(); this.cycleCellFlag(btnEl); return false; })
            this.gameGrid.appendChild(btnEl);
        }

        // TODO: Prevent this from becoming unmanageable at large grid sizes!!
        while ( this.kittyCells.length < this.kittyCount ) {
            let newCell = Math.floor(Math.random() * this.gridCount);
            if ( !this.kittyCells.includes(newCell) ) {
                this.kittyCells.push(newCell);
            }
        }
    },

    gameEnd: function ( popupId ) {
        let cells = document.querySelectorAll('.kitty-space');
        for ( let x = 0, ln = cells.length; x < ln; x++ ) {
            cells[x].setAttribute('disabled', '');
        }

        this.showPopup(document.getElementById(popupId));
    },

    cycleCellFlag: function ( buttonEl ) {
        let newChild;
        while ( buttonEl.firstChild ) {
            buttonEl.removeChild(buttonEl.firstChild);
        }
        if ( buttonEl.classList.contains('question') ) {
            buttonEl.classList.remove('question');
        }
        else if ( buttonEl.classList.contains('flagged') ) {
            buttonEl.classList.remove('flagged');
            buttonEl.classList.add('question');
            newChild = document.createTextNode('?');
            buttonEl.appendChild(newChild);
        }
        else {
            buttonEl.classList.add('flagged');
            newChild = document.createElement('img');
            newChild.setAttribute('src', FLAG_IMG_SRC);
            buttonEl.appendChild(newChild);
        }
    },

    getAdjacentCells: function ( cellId ) {
        let isTopRow = ((cellId - this.colCount < 0) ? true : false);
        let isBottomRow = ((cellId + this.colCount >= this.gridCount) ? true : false);
        let isFirstCol = ((cellId % this.colCount == 0) ? true : false);
        let isLastCol = ((cellId % this.colCount == this.colCount - 1) ? true : false);
        let cells = [];

        // Cells before and after (if it's not the first or last on the row)
        if ( !isFirstCol ) {
            cells.push(cellId - 1);
        }
        if ( !isLastCol ) {
            cells.push(cellId + 1);
        }
        // Cells above and below (if it's not the first or last in the column)
        if ( !isTopRow ) {
            cells.push(cellId - this.colCount);
        }
        if ( !isBottomRow ) {
            cells.push(cellId + this.colCount);
        }
        // And finally, the diagonals (ignoring the edges)
        if ( !isFirstCol && !isTopRow ) {
            cells.push(cellId - 1 - this.colCount);
        }
        if ( !isFirstCol && !isBottomRow ) {
            cells.push(cellId - 1 + this.colCount);
        }
        if ( !isLastCol && !isTopRow ) {
            cells.push(cellId + 1 - this.colCount);
        }
        if ( !isLastCol && !isBottomRow ) {
            cells.push(cellId + 1 + this.colCount);
        }

        return cells;
    },

    handleCellClick: function ( buttonEl ) {
        // Make sure we're not handling a button already clicked or revealed
        if ( buttonEl.disabled ) {
            return;
        }

        this.resolveCell(buttonEl);
    },

    resolveCell: function ( buttonEl ) {
        let cellId = parseInt(buttonEl.dataset.cellId);

        // Check if the cell is flagged - if so, ignore the click (prevent accidental clicks on kitty-containing spaces)
        if ( buttonEl.classList.contains('flagged') ) {
            return;
        }

        // Clear any child elements (flags or question marks placed by the user)
        while ( buttonEl.firstChild ) {
            buttonEl.removeChild(buttonEl.firstChild);
        }
        // Disable the cell to prevent multiple actions
        buttonEl.setAttribute('disabled', '');

        // Check the button cell number - are we a kitty?
        if ( this.kittyCells.includes(cellId) ) {
            let kitty = document.createElement('img');
            kitty.setAttribute('src', CAT_IMG_SRC);
            buttonEl.appendChild(kitty);
            buttonEl.classList.add('hit');
            this.revealKitties();
            this.gameEnd('game-lost-popup');
        }
        else {
            // Mark the cell as cleared
            buttonEl.classList.add('cleared');
            // Get the id of adjacent cells horizontally, vertically, and diagonally
            let adjacentIds = this.getAdjacentCells(cellId);
            let surroundingKitties = 0;
            for ( let i = 0, ln = adjacentIds.length; i < ln; i++ ) {
                if ( this.kittyCells.includes(adjacentIds[i]) ) {
                    surroundingKitties++;
                }
            }
            if ( surroundingKitties > 0 ) { 
                // More than one kitty in adjacent cells - reveal the number and stop
                buttonEl.appendChild(document.createTextNode(surroundingKitties));
                buttonEl.classList.add(`count${surroundingKitties}`);
            }
            else {
                // No kitties!  Leave empty, and resolve each of the uncleared, unflagged adjacent cells
                let adjacentCell;
                for ( let x = 0, ln = adjacentIds.length; x < ln; x++ ) {
                    adjacentCell = document.querySelector(`.kitty-space[data-cell-id="${adjacentIds[x]}"]:not(.cleared):not(.flagged):not(.question)`);
                    if ( !adjacentCell ) {
                        continue;
                    }
                    if ( !adjacentCell.disabled && !this.resolveQueue.includes(adjacentCell) ) {
                        this.resolveQueue.push(adjacentCell);
                    }
                }
            }
        }

        if ( this.resolveQueue.length > 0 ) {
            this.resolveCell(this.resolveQueue.pop());
        }
        else {
            // Check for win condition - that is, only the kitty cells remain (and no kitties hit)
            let uncleared = document.querySelectorAll('.kitty-space:not(.cleared):not(.hit)');
            if ( uncleared.length == this.kittyCount ) {
                this.gameEnd('game-won-popup');
            }
        }
    },

    revealKitties: function () {
        // Reveal kitties that have not been flagged
        for ( let x = 0; x < this.kittyCount; x++ ) {
            let cell = document.querySelector(`.kitty-space[data-cell-id="${this.kittyCells[x]}"]:not(.flagged)`);
            if ( !cell ) {
                continue;
            }

            let kitty = document.createElement('img');
            kitty.setAttribute('src', CAT_IMG_SRC);
            cell.appendChild(kitty);
            cell.classList.add('cleared');
        }

        // Get all flagged cells and compare them to our kitty list to reveal incorrectly flagged cells
        let flaggedCells = document.querySelectorAll('.kitty-space.flagged');
        for ( let x = 0, ln = flaggedCells.length; x < ln; x++ ) {
            if ( !this.kittyCells.includes(parseInt(flaggedCells[x].dataset.cellId)) ) {
                // Clear the flag child element
                while ( flaggedCells[x].firstChild ) {
                    flaggedCells[x].removeChild(flaggedCells[x].firstChild);
                }

                // Reveal the "incorrect kitty"
                let nokitty = document.createElement('img');
                nokitty.setAttribute('src', CAT_INCORRECT_IMG_SRC);
                flaggedCells[x].appendChild(nokitty);
                flaggedCells[x].classList.add('cleared');
            }
        }
    },

    showPopup: function ( popupEl ) {
        popupEl.classList.add('slidedown');
        popupEl.style.display = 'block';
    },

    hidePopup: function ( popupEl ) {
        popupEl.classList.remove('slidedown');
        popupEl.style.display = 'none';
    }
};

window.addEventListener('load', () => { GameBoard.init(); });
