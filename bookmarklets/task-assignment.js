javascript:( function() {
    const BOX_ID = 'myCustomAsciiTableBox_12345';
    const EXCLUDED_PEOPLE = ["Trinh Nguyen", "BeSmartee AI Agent", "Aaron Joseph", "Ngoc Nguyen", "Oanh Phan", "Nhung Tran", "An La", "Darryl Namayan", "Sarah Tan", "Tamine De Luna", "Noel Leon", ""];
    const STATUS_ORDER = ["Blocked", "Backlog", "Ready For Development", "In Development", "Code Review", "Ready For Testing", "In Testing", "Product Sign-off", "Cancelled", "Done"];
    const DEV_ORDER = ["Nghia Vu", "Anthony Diep", "Thong Trinh", "Cuong Le", "Huy Tran", "Alexandre Santiago", "Huy Chau", "Nghi Ho"];
    let workStats = {};
    let allStatuses = new Set();        /* Iterate through each ticket */
    jQuery( "tr.issuerow" ).each( function() {
        let ticketData = { storyPoints: getStoryPoints( jQuery( this ) ), developer: getDeveloper( jQuery( this ) ), codeReviewers: getCodeReviewers( jQuery( this ) ), isRegressionBug: determineIfIsRegressionBug( jQuery( this ) ), status: getStatus( jQuery( this ) ), isBlocked: getIsBlocked( jQuery( this ) ) };
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
    let tableStr = buildTable( workStats, sortedStatuses, sortedDevs );
    createOrUpdateBox( tableStr );

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

    function formatPointsCount( points, count, regressionSuffix ) {
        const suffix = regressionSuffix || "";
        return "<strong>" + points + "</strong>" + suffix + " <span style=\"color:#888\">(" + count + ")</span>";
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

    function buildTable( data, statuses, devs ) {
        data = removeExcludedPeople( data );
        const headers = ["Status"].concat( devs );
        const colWidths = headers.map( h => h.length );
        const metaRows = [{
            label: "Dev", cells: devs.map( d => {
                const s = data[d];
                const regressionSuffix = s.regressionDev > 0 ? "+" + s.regressionDev : "";
                const devStr = "<a href=\"#\" data-type=\"dev\" data-name=\"" + d + "\">" + formatPointsCount( s.dev, s.devCount, regressionSuffix ) + "</a>";
                return devStr;
            } )
        }, {
            label: "Review", cells: devs.map( d => {
                const s = data[d];
                const regressionSuffix = s.regressionReview > 0 ? "+" + s.regressionReview : "";
                const revStr = "<a href=\"#\" data-type=\"review\" data-name=\"" + d + "\">" + formatPointsCount( s.review, s.reviewCount, regressionSuffix ) + "</a>";
                return revStr;
            } )
        },];
        const statusRows = statuses.map( st => {
            return {
                label: st, cells: devs.map( d => {
                    const pts = ( data[d] && data[d].statusPoints[st] ) || 0;
                    const cnt = ( data[d] && data[d].statusCounts[st] ) || 0;
                    if ( pts === 0 ) return "";
                    const val = formatPointsCount( pts, cnt );
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

    function createOrUpdateBox( tableHTML ) {
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
            wrapper.appendChild( header );
            wrapper.appendChild( content );
            document.body.appendChild( wrapper );
            let isDragging = false, offsetX = 0, offsetY = 0;
            header.addEventListener( "mousedown", e => {
                isDragging = true;
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
                if ( isDragging ) {
                    wrapper.style.left = ( e.clientX - offsetX ) + 'px';
                    wrapper.style.top = ( e.clientY - offsetY ) + 'px';
                }
            } );
            header.addEventListener( "click", () => {
                const isHidden = content.style.display === "none";
                content.style.display = isHidden ? "block" : "none";
                header.textContent = "Work Stats " + ( isHidden ? "▾" : "▸" );
            } );
        }
        const pre = wrapper.querySelector( "pre" );
        pre.innerHTML = tableHTML;
        pre.querySelectorAll( "a[data-type][data-name]" ).forEach( a => {
            a.style.color = "#6cf";
        } );
    }
} )();