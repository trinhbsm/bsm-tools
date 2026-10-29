javascript:( function() {
    const BOX_ID = 'myCustomAsciiTableBox_12345';
    const EXCLUDE_CARRIED_OVER_KEY = BOX_ID + '_excludeCarriedOver';
    const SHOW_COUNTS_KEY = BOX_ID + '_showCounts';
    const SHOW_REVIEW_ROW_KEY = BOX_ID + '_showReviewRow';
    const KEYDOWN_BOUND_KEY = BOX_ID + '_keydownBound';
    const KEYDOWN_HANDLER_KEY = BOX_ID + '_keydownHandler';
    const EXCLUDED_PEOPLE = ["Trinh Nguyen", "BeSmartee AI Agent", "Aaron Joseph", "Ngoc Nguyen", "Oanh Phan", "Nhung Tran", "An La", "Darryl Namayan", "Sarah Tan", "Tamine De Luna", "Noel Leon", ""];
    const STATUS_ORDER = ["Blocked", "Backlog", "Ready For Development", "In Development", "Code Review", "Ready For Testing", "In Testing", "Product Sign-off", "Cancelled", "Done"];
    const DEV_ORDER = ["Nghia Vu", "Anthony Diep", "Thong Trinh", "Cuong Le", "Huy Tran", "Alexandre Santiago", "Huy Chau", "Nghi Ho"];
    let workStats = {};
    let allStatuses = new Set();

    function getExcludeCarriedOver() {
        if ( typeof window[EXCLUDE_CARRIED_OVER_KEY] !== "boolean" ) {
            window[EXCLUDE_CARRIED_OVER_KEY] = true;
        }
        return window[EXCLUDE_CARRIED_OVER_KEY];
    }

    function setExcludeCarriedOver( value ) {
        window[EXCLUDE_CARRIED_OVER_KEY] = value;
    }

    function getShowCounts() {
        if ( typeof window[SHOW_COUNTS_KEY] !== "boolean" ) {
            window[SHOW_COUNTS_KEY] = true;
        }
        return window[SHOW_COUNTS_KEY];
    }

    function setShowCounts( value ) {
        window[SHOW_COUNTS_KEY] = value;
    }

    function getShowReviewRow() {
        if ( typeof window[SHOW_REVIEW_ROW_KEY] !== "boolean" ) {
            window[SHOW_REVIEW_ROW_KEY] = true;
        }
        return window[SHOW_REVIEW_ROW_KEY];
    }

    function setShowReviewRow( value ) {
        window[SHOW_REVIEW_ROW_KEY] = value;
    }

    function recalculateAndRender() {
        workStats = {};
        allStatuses = new Set();
        const excludeCarriedOver = getExcludeCarriedOver();
        const showCounts = getShowCounts();
        const showReviewRow = getShowReviewRow();
        jQuery( "tr.issuerow" ).each( function() {
            const row = jQuery( this );
            if ( excludeCarriedOver && hasAssignedSLabel( row ) ) {
                return;
            }
            let ticketData = { storyPoints: getStoryPoints( row ), developer: getDeveloper( row ), codeReviewers: getCodeReviewers( row ), isRegressionBug: determineIfIsRegressionBug( row ), status: getStatus( row ), isBlocked: getIsBlocked( row ) };
            if ( ticketData.status ) {
                allStatuses.add( ticketData.status );
            }
            if ( ticketData.isBlocked ) {
                allStatuses.add( "Blocked" );
            }
            workStats = updateWorkStats( workStats, ticketData );
        } );
        let sortedStatuses = sortByPredefinedOrder( Array.from( allStatuses ), STATUS_ORDER );
        let sortedDevs = sortByPredefinedOrder( Object.keys( removeExcludedPeople( workStats ) ), DEV_ORDER );
        let tableStr = buildTable( workStats, sortedStatuses, sortedDevs, showCounts, showReviewRow );
        createOrUpdateBox( tableStr, excludeCarriedOver );
    }

    function bindHotkeys() {
        if ( typeof window[KEYDOWN_HANDLER_KEY] === "function" ) {
            document.removeEventListener( "keydown", window[KEYDOWN_HANDLER_KEY] );
        } else if ( window[KEYDOWN_BOUND_KEY] ) {
            return;
        }
        function onKeyDown( e ) {
            if ( !e.shiftKey || e.ctrlKey || e.altKey || e.metaKey ) {
                return;
            }
            const key = e.key.toLowerCase();
            if ( key !== "a" && key !== "t" && key !== "r" ) {
                return;
            }
            const target = e.target;
            if ( target && target.closest && target.closest( 'input, textarea, [contenteditable="true"]' ) ) {
                return;
            }
            e.preventDefault();
            if ( key === "a" ) {
                setExcludeCarriedOver( !getExcludeCarriedOver() );
            } else if ( key === "t" ) {
                setShowCounts( !getShowCounts() );
            } else if ( key === "r" ) {
                setShowReviewRow( !getShowReviewRow() );
            }
            recalculateAndRender();
        }
        window[KEYDOWN_HANDLER_KEY] = onKeyDown;
        window[KEYDOWN_BOUND_KEY] = true;
        document.addEventListener( "keydown", onKeyDown );
    }

    bindHotkeys();
    recalculateAndRender();

    function clickRefreshButtons() {
        jQuery( '[data-testid="dashboard-internal-common.ui.gadget.toolbar.refresh-button"]' ).each( function() {
            jQuery( this ).click();
        } );
    }

    function clearExistingIntervals() {
        const intervalID = window.setInterval( function() {
        }, Number.MAX_SAFE_INTEGER );
        for ( let i = 1; i <= intervalID; i++ ) {
            window.clearInterval( i );
        }
    }

    function getStoryPoints( selector ) {
        let storyPoints = parseInt( cleanExtraBlankSpaces( selector.find( "td.customfield_10026" ).text() ) );
        if ( isNaN( storyPoints ) ) {
            storyPoints = 0;
        }
        return storyPoints;
    }

    function getDeveloper( selector ) {
        return cleanExtraBlankSpaces( selector.find( "td.customfield_10050" ).text() );
    }

    function getCodeReviewers( selector ) {
        let codeReviewers = cleanExtraBlankSpaces( selector.find( "td.customfield_10186" ).text() );
        return codeReviewers.split( ", " );
    }

    function getStatus( selector ) {
        return cleanExtraBlankSpaces( selector.find( ".jira-issue-status-lozenge" ).text() );
    }

    function getIsBlocked( selector ) {
        let blockedText = cleanExtraBlankSpaces( selector.find( "td.customfield_10030" ).text() );
        return blockedText.length > 0;
    }

    function getIssueType( selector ) {
        return selector.find( "td.issuetype img" ).attr( "alt" );
    }

    function getLabels( selector ) {
        let labels = [];
        selector.find( "td.labels" ).each( function() {
            jQuery( this ).find( "a" ).each( function() {
                labels.push( cleanExtraBlankSpaces( jQuery( this ).text() ) );
            } );
        } );
        return labels;
    }

    function hasAssignedSLabel( selector ) {
        let labels = getLabels( selector );
        for ( let i = 0; i < labels.length; i++ ) {
            if ( labels[i].startsWith( "Assigned-S" ) ) {
                return true;
            }
        }
        return false;
    }

    function determineIfIsRegressionBug( selector ) {
        let issueType = getIssueType( selector );
        if ( issueType !== "Sub-Defect" ) {
            return false;
        }
        let labels = getLabels( selector );
        for ( let i = 0; i < labels.length; i++ ) {
            if ( labels[i] === "Regression-Bug" ) {
                return true;
            }
        }
        return false;
    }

    function getInitialWorkStats() {
        return { dev: 0, devCount: 0, review: 0, reviewCount: 0, regressionDev: 0, regressionReview: 0, blocked: 0, statusPoints: {}, statusCounts: {} };
    }

    function updateWorkStats( workStats, ticketData ) {
        if ( !workStats.hasOwnProperty( ticketData.developer ) ) {
            workStats[ticketData.developer] = getInitialWorkStats();
        }
        workStats[ticketData.developer]["dev"] += ticketData.storyPoints;
        workStats[ticketData.developer]["devCount"] += 1;
        workStats[ticketData.developer]["regressionDev"] += ( ticketData.isRegressionBug ? 1 : 0 );
        if ( ticketData.isBlocked ) {
            workStats[ticketData.developer]["blocked"] += ticketData.storyPoints;
            if ( !workStats[ticketData.developer]["statusPoints"].hasOwnProperty( "Blocked" ) ) {
                workStats[ticketData.developer]["statusPoints"]["Blocked"] = 0;
                workStats[ticketData.developer]["statusCounts"]["Blocked"] = 0;
            }
            workStats[ticketData.developer]["statusPoints"]["Blocked"] += ticketData.storyPoints;
            workStats[ticketData.developer]["statusCounts"]["Blocked"] += 1;
        }
        if ( ticketData.status ) {
            if ( !workStats[ticketData.developer]["statusPoints"].hasOwnProperty( ticketData.status ) ) {
                workStats[ticketData.developer]["statusPoints"][ticketData.status] = 0;
                workStats[ticketData.developer]["statusCounts"][ticketData.status] = 0;
            }
            workStats[ticketData.developer]["statusPoints"][ticketData.status] += ticketData.storyPoints;
            workStats[ticketData.developer]["statusCounts"][ticketData.status] += 1;
        }
        for ( let i = 0; i < ticketData.codeReviewers.length; i++ ) {
            if ( !workStats.hasOwnProperty( ticketData.codeReviewers[i] ) ) {
                workStats[ticketData.codeReviewers[i]] = getInitialWorkStats();
            }
            workStats[ticketData.codeReviewers[i]]["review"] += ticketData.storyPoints;
            workStats[ticketData.codeReviewers[i]]["reviewCount"] += 1;
            workStats[ticketData.codeReviewers[i]]["regressionReview"] += ( ticketData.isRegressionBug ? 1 : 0 );
        }
        return workStats;
    }

    function sortByPredefinedOrder( items, order ) {
        const orderLower = order.map( o => o.toLowerCase() );
        const listed = order.map( o => items.find( item => item.toLowerCase() === o.toLowerCase() ) ).filter( Boolean );
        const unlisted = items.filter( item => orderLower.indexOf( item.toLowerCase() ) === -1 ).sort();
        return listed.concat( unlisted );
    }

    function cleanExtraBlankSpaces( str ) {
        return str.replace(/\s+/g, ' ').trim();
    }

    function formatPointsCount( points, count, regressionSuffix, showCounts ) {
        const suffix = regressionSuffix || "";
        let value = "<strong>" + points + "</strong>" + suffix;
        if ( showCounts ) {
            value += " <span style=\"color:#888\">(" + count + ")</span>";
        }
        return value;
    }

    function removeExcludedPeople( data ) {
        let cleaned = {};
        for ( const [key, value] of Object.entries( data ) ) {
            if ( !EXCLUDED_PEOPLE.includes( key ) ) {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    function buildTable( data, statuses, devs, showCounts, showReviewRow ) {
        data = removeExcludedPeople( data );
        const headers = ["Status"].concat( devs );
        const colWidths = headers.map( h => h.length );
        const metaRows = [{
            label: "Dev", cells: devs.map( d => {
                const s = data[d];
                const regressionSuffix = s.regressionDev > 0 ? "+" + s.regressionDev : "";
                const devStr = "<a href=\"#\" data-type=\"dev\" data-name=\"" + d + "\">" + formatPointsCount( s.dev, s.devCount, regressionSuffix, showCounts ) + "</a>";
                return devStr;
            } )
        }];
        if ( showReviewRow ) {
            metaRows.push( {
                label: "Review", cells: devs.map( d => {
                    const s = data[d];
                    const regressionSuffix = s.regressionReview > 0 ? "+" + s.regressionReview : "";
                    const revStr = "<a href=\"#\" data-type=\"review\" data-name=\"" + d + "\">" + formatPointsCount( s.review, s.reviewCount, regressionSuffix, showCounts ) + "</a>";
                    return revStr;
                } )
            } );
        }
        const statusRows = statuses.map( st => {
            return {
                label: st, cells: devs.map( d => {
                    const pts = ( data[d] && data[d].statusPoints[st] ) || 0;
                    const cnt = ( data[d] && data[d].statusCounts[st] ) || 0;
                    if ( pts === 0 ) return "";
                    const val = formatPointsCount( pts, cnt, "", showCounts );
                    return st === "Blocked" ? "<span style=\"color:#f66\">" + val + "</span>" : val;
                } )
            };
        } );
        const allRows = metaRows.concat( statusRows );
        for ( const row of allRows ) {
            colWidths[0] = Math.max( colWidths[0], row.label.length );
            row.cells.forEach( ( cell, i ) => {
                const textOnly = cell.replace( /<[^>]*>/g, '' );
                colWidths[i + 1] = Math.max( colWidths[i + 1], textOnly.length );
            } );
        }

        function pad( str, len ) {
            const plain = str.replace( /<[^>]*>/g, '' );
            return str + ' '.repeat( len - plain.length );
        }

        const sep = "+" + colWidths.map( w => "-".repeat( w + 2 ) ).join( "+" ) + "+";
        const headerRow = "| " + headers.map( ( h, i ) => h.padEnd( colWidths[i] ) ).join( " | " ) + " |";

        function wrapRow( content, bg ) {
            return "<span style=\"display:block;background:" + bg + "\">" + content + "</span>";
        }

        const ROW_EVEN = "#111";
        const ROW_ODD = "#1a1a2e";
        const metaBodyRows = metaRows.map( ( row, idx ) => {
            const line = "| " + pad( row.label, colWidths[0] ) + " | " + row.cells.map( ( cell, i ) => pad( cell, colWidths[i + 1] ) ).join( " | " ) + " |";
            return wrapRow( line, idx % 2 === 0 ? ROW_EVEN : ROW_ODD );
        } );
        const statusBodyRows = statusRows.map( ( row, idx ) => {
            const labelStr = row.label === "Blocked" ? "<span style=\"color:#f66\">" + pad( row.label, colWidths[0] ) + "</span>" : pad( row.label, colWidths[0] );
            const line = "| " + labelStr + " | " + row.cells.map( ( cell, i ) => pad( cell, colWidths[i + 1] ) ).join( " | " ) + " |";
            return wrapRow( line, idx % 2 === 0 ? ROW_EVEN : ROW_ODD );
        } );
        return [sep, headerRow, sep, metaBodyRows.join( "" ), sep, statusBodyRows.join( "" ), sep].join( "\n" );
    }

    function buildCarriedOverStatusHtml( excludeCarriedOver ) {
        if ( excludeCarriedOver ) {
            return "Carried-over tickets are <strong style=\"color:#f66\">excluded</strong> from calculations.";
        }
        return "Carried-over tickets are <strong style=\"color:#6f6\">included</strong> in calculations.";
    }

    function buildFooterHtml() {
        return "<div style=\"margin-bottom:6px\"><strong>Tips</strong></div><ul style=\"margin:0 0 10px 18px;padding:0\"><li>Press <strong>Shift+A</strong> to toggle whether carried-over tickets (Assigned-S* labels) are included in calculations.</li><li>Press <strong>Shift+T</strong> to show or hide the numbers in parentheses.</li><li>Press <strong>Shift+R</strong> to show or hide the Review row.</li></ul><div class=\"carried-over-status\"></div>";
    }

    function createOrUpdateBox( tableHTML, excludeCarriedOver ) {
        let wrapper = document.getElementById( BOX_ID );
        if ( !wrapper ) {
            wrapper = document.createElement( "div" );
            wrapper.id = BOX_ID;
            wrapper.style.position = "fixed";
            wrapper.style.top = "20px";
            wrapper.style.right = "20px";
            wrapper.style.left = "auto";
            wrapper.style.border = "1px solid #444";
            wrapper.style.background = "#111";
            wrapper.style.color = "#eee";
            wrapper.style.fontFamily = "monospace";
            wrapper.style.overflow = "visible";
            wrapper.style.zIndex = 99999;
            const header = document.createElement( "div" );
            header.textContent = "Work Stats ▾";
            header.style.padding = "6px 10px";
            header.style.cursor = "pointer";
            header.style.background = "#222";
            header.style.borderBottom = "1px solid #444";
            header.style.userSelect = "none";
            const content = document.createElement( "pre" );
            content.style.margin = 0;
            content.style.padding = "10px";
            content.style.whiteSpace = "pre";
            content.style.display = "block";
            const footer = document.createElement( "div" );
            footer.className = "work-stats-footer";
            footer.style.padding = "10px";
            footer.style.borderTop = "1px solid #444";
            footer.style.fontFamily = "monospace";
            footer.style.fontSize = "12px";
            footer.innerHTML = buildFooterHtml();
            wrapper.appendChild( header );
            wrapper.appendChild( content );
            wrapper.appendChild( footer );
            document.body.appendChild( wrapper );
            let isDragging = false, didDrag = false, startX = 0, startY = 0, offsetX = 0, offsetY = 0;
            const DRAG_THRESHOLD = 5;
            header.addEventListener( "mousedown", e => {
                isDragging = true;
                didDrag = false;
                startX = e.clientX;
                startY = e.clientY;
                offsetX = e.clientX - wrapper.offsetLeft;
                offsetY = e.clientY - wrapper.offsetTop;
                wrapper.style.left = wrapper.offsetLeft + 'px';
                wrapper.style.top = wrapper.offsetTop + 'px';
                wrapper.style.right = 'auto';
                wrapper.style.bottom = 'auto';
                e.preventDefault();
            } );
            document.addEventListener( "mouseup", () => isDragging = false );
            document.addEventListener( "mousemove", e => {
                if ( !isDragging ) {
                    return;
                }
                if ( !didDrag ) {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    if ( Math.abs( dx ) < DRAG_THRESHOLD && Math.abs( dy ) < DRAG_THRESHOLD ) {
                        return;
                    }
                    didDrag = true;
                }
                wrapper.style.left = ( e.clientX - offsetX ) + 'px';
                wrapper.style.top = ( e.clientY - offsetY ) + 'px';
            } );
            header.addEventListener( "click", () => {
                if ( didDrag ) {
                    return;
                }
                const footer = wrapper.querySelector( ".work-stats-footer" );
                const isHidden = content.style.display === "none";
                content.style.display = isHidden ? "block" : "none";
                if ( footer ) {
                    footer.style.display = isHidden ? "block" : "none";
                }
                header.textContent = "Work Stats " + ( isHidden ? "▾" : "▸" );
            } );
        }
        const pre = wrapper.querySelector( "pre" );
        pre.innerHTML = tableHTML;
        pre.querySelectorAll( "a[data-type][data-name]" ).forEach( a => {
            a.style.color = "#6cf";
        } );
        const footerEl = wrapper.querySelector( ".work-stats-footer" );
        if ( footerEl ) {
            footerEl.innerHTML = buildFooterHtml();
        }
        const statusEl = wrapper.querySelector( ".carried-over-status" );
        if ( statusEl ) {
            statusEl.innerHTML = buildCarriedOverStatusHtml( excludeCarriedOver );
        }
    }
} )();