/*
Parameters:
nodeData -> See the index.html in the example directory for the structure of 'nodeData'
rootNodeId -> The root of the CI dependency chain
settings -> object that stores desired settings.  Required settings are 'width' and 'height'
*/
function CiGraph(nodeData, rootNodeId, settings) {

    // Default settings

    // css selector inside which the graph wil be drawn
    settings.container = settings.container || "body";

    settings.circleSize = settings.circleSize || 10;
    settings.horizontalOffset = settings.horizontalOffset || 180;
    settings.arcRotationSpeed = settings.arcRotationSpeed || 1500;
    settings.flashSpeed = settings.flashSpeed || 600;
    settings.font = settings.font || "ciGraph";

    // console.log(settings)

    var buildGraph;

    CiGraph.prototype.init = 
        function() {
            // console.log("init called");
            // console.log(nodeData)
            buildGraph = new BuildGraph(nodeData, rootNodeId);
            // console.log("width:" + settings.width + " height: " + settings.height)
            buildGraph.draw();
        }

    CiGraph.prototype.update =
        function(nodeData) {
        // console.log("update called")
        // console.log(nodeData);
        buildGraph.update(nodeData);
    }

    function BuildGraph(nodeData, rootNodeId) {
        this.nodeData = nodeData;
        this.rootNode = this.getNodeById(rootNodeId);
        this.nodes = [];
        this.buildNodes();
    }

    BuildGraph.prototype.update =
        function(nodeData) {
            this.oldNodeData = this.nodeData;
            this.nodeData = nodeData;
            this.buildNodes();
            this.tree.redraw(this.rootNode);
        }

    BuildGraph.prototype.getNodeById =
            function (nodeId, nodeArray) {
                var nodes = nodeArray || this.nodeData;
                var foundNode = null;
                nodes.forEach(function (thisNode) {
                    
                    if (thisNode.BuildTypeId == nodeId) {
                        foundNode = thisNode;
                    }
                });
                return foundNode;
            }

    BuildGraph.prototype.getAllDependentNodes =
        function (node) {
            var dependentNodes = [];
            this.nodeData.forEach(function (currNode) {
                if (currNode.DependencyIds.indexOf(node.BuildTypeId) != -1) {
                    dependentNodes.push(currNode);
                    // console.log("Pushing dependent node: " + currNode.BuildTypeId);
                }
            });

            return dependentNodes;
        }

    // Breadth-first traversal of the node dependency chain.
    // Used to assign children to each node to render graph.
    BuildGraph.prototype.buildNodes = 
            function() {
                var graph = this;
                var queue = [];
                var nodes = [];
                this.rootNode.depth = 0;
                queue.push(this.rootNode);
                nodes.push(this.rootNode);
        
                while (queue.length > 0) {
                    var currentNode = queue.shift();
                    if (currentNode.Inactive) {
                        currentNode.status = "inactive";
                        currentNode.StatusText = "Not yet started";
                    }
                    else if (currentNode.Failed) {
                        if (currentNode.FailedDependency) {
                            currentNode.StatusText = "A parent build failed"
                        }
                        currentNode.status = "failed";
                    }
                    else if (currentNode.FailedButStillRunning) {
                        currentNode.status = "runningButFailed";
                    }
                    else if (currentNode.Running) {
                        currentNode.status = "running";
                    } else {
                        currentNode.status = "succeeded";
                    }

                    var dependentNodes = this.getAllDependentNodes(currentNode);
                    if (dependentNodes.length > 0) {
                        currentNode.children = [];
                        dependentNodes.forEach(function (child) { 
                            var visited = graph.getNodeById(child.BuildTypeId, nodes);
                            // If we haven't already visited this node
                            if (visited == undefined) {
                                // Push the child node into the queue and our list of nodes, set it's depth
                                currentNode.children.push(child);
                                queue.push(child);
                                nodes.push(child);
                                child.depth = currentNode.depth + 1;
                                child.parent = currentNode;
                            }
                            // If we already visited this node, we need to update this node's parent if this parent has a larger depth
                            else if (child.parent.depth < currentNode.depth) {
                                // Remove the child from it's current parent
                                child.parent.children.splice($.inArray(child, child.parent.children), 1);
                                // Add it to it's new parent
                                currentNode.children.push(child);
                                child.depth = currentNode.depth + 1;
                                child.parent = currentNode;
                            }
                        });
                    }
                }
                // console.log("Built nodes: ");
                // console.log(nodes);
                this.nodes = nodes;
            }

    BuildGraph.prototype.draw =
        function () {
            this.tree = new Tree(settings);
            this.tree.redraw(this.rootNode);
        }

    function Tree(settings) {
        var tree = this;
        this.settings = settings;

        this.width = this.settings.width;
        this.height = this.settings.height;
        this.d3tree = d3.layout.tree()
                .size([this.settings.height, this.settings.width - 380]);

        this.animator = new Animator();

        // TODO make the element selected here settable in constructor or in DOM
        this.container = d3.select(this.settings.container);
        this.svg =  this.container
                        .append("svg:svg")
                        .attr("width", this.settings.width)
                        .attr("height", this.settings.height)
                        .append("g");

        this.diagonal = d3.svg.diagonal()
                            .projection(function(d) {
                                return [d.y+tree.settings.horizontalOffset, d.x];
                            });

        // Arcs that rotate around running nodes
        this.runningArc1 = d3.svg.arc()
            .innerRadius(this.settings.circleSize / 2 + 7)
            .outerRadius(this.settings.circleSize / 2 + 10)
            .startAngle(0 * (Math.PI / 180))
            .endAngle(100 * (Math.PI / 180));

        this.runningArc2 = d3.svg.arc()
            .innerRadius(this.settings.circleSize / 2 + 7)
            .outerRadius(this.settings.circleSize / 2 + 10)
            .startAngle(180 * (Math.PI / 180))
            .endAngle(280 * (Math.PI / 180));

        this.blurFilter = this.svg
                .append("svg:defs")
                .append("svg:filter")
                .attr("id", "blur")
                .append("svg:feGaussianBlur")
                .attr("stdDeviation", .8);
    }

    Tree.prototype.redraw =
        function (rootNode) {
            var tree = this;

            var treeNodeData = this.d3tree.nodes(rootNode);
            var treeLinkData = this.d3tree.links(treeNodeData);

            var paths = this.svg.selectAll("path.link")
                            .data(treeLinkData);

            paths.exit().remove();
            paths.enter().append("path");

            // Update paths in case they changed
            paths.attr("d", this.diagonal).attr("class", "link");

            this.nodeElements = this.svg.selectAll("g.node")
                                        .data(treeNodeData);

            var nodeEnter = this.nodeElements.enter().append("g");

            var circle =  nodeEnter
                          .append("g")
                          .append("svg:circle")
                          .attr("visibility", "visible")
                          .attr("r", tree.settings.circleSize)
                          .style("fill", function(d) {
                                            return d.status;
                                        })
                          //.attr("filter", "url(#blur)");

            var text = nodeEnter.append("svg:text")
            .attr("transform", function (d) {
                                   dx = d.children ? -20 : 20;
                                   dy = d.children ? -5 : 3;
                                   return "translate(" + dx + "," + dy + ")";
                                })
            .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
            .attr("font-family", tree.settings.font)
            .attr("class", "nodeText")
            .text(function(d) {
                    return d.Name;
                });

            this.nodeElements.exit().remove();

            // Updates the nodes to display with the new data
            this.nodeElements
                .attr("id", function(d) {
                                return d.BuildTypeId + "-" + d.Name;
                            })
            .attr("transform", function (d) {
                                var temp = d.x;
                                d.x = d.y + tree.settings.horizontalOffset;
                                d.y = temp;
                                return "translate(" + d.x + "," + d.y + ")";
                            })
            .attr("class", function(d) {
                            return "node " + d.status;
                            })
            .on("mouseover", function(d) {
                                if (d.Succeeded || d.Inactive || d.FailedDependency) {
                                    var infoBox = tree.getInfoBox(d);
                                    tree.showInfoBox(infoBox);
                                }
                            })
            .on("mouseout", function(d) {
                                if (d.Succeeded || d.Inactive || d.FailedDependency) {
                                    var infoBox = tree.getInfoBox(d);
                                    tree.hideInfoBox(infoBox);
                                }
                            })
            .on("click", function(d) {
                            if (d.LogUrl) {
                                tree.container 
                                .append("div")
                                .attr("href", d.LogUrl)
                                .attr("class", "linkFrame")
                                .attr("data-fancybox-type", "iframe");
                                
                                $(".linkFrame").fancybox({
                                                fitToView: true,
                                                width: '85%',
                                                height: '85%',
                                                autoSize: false,
                                                closeClick: false,
                                                openEffect: 'fade',
                                                closeEffect: 'fade',
                                                openMethod: 'zoomIn',
                                                closeMethod: 'zoomOut',
                                                title: d.Name,
                                                afterClose: function() {
                                                                $(".linkFrame").remove();
                                                            }
                                                });


                                $(".linkFrame").trigger('click');
                            }
                        })
            .each(function(d, i) {
                    var circle = d3.select(this).select("g")
                    var infoBox;

                    // Update info boxes
                    if (d.Succeeded || d.Inactive) {
                        if (tree.infoBoxExists(d)) {
                            var infoBoxToHide = tree.getInfoBox(d);
                            // only update this info box *after* we hide it (which is what we do in the specified callback) 
                            //because we want the cool effect where, after the node updates, if it was running, the old info box fades out
                            tree.hideInfoBox(infoBoxToHide, function() {
                                var infoBox = tree.updateInfoBox(d, false);
                                tree.hideInfoBox(infoBox);
                            });
                        }
                        else {
                            var infoBox = tree.createInfoBox(d, false);
                            tree.hideInfoBox(infoBox);
                        }
                        
                    }

                    else if (d.FailedButStillRunning || d.Failed || d.Running) {
                        if (tree.infoBoxExists(d))  { 
                            infoBox = tree.updateInfoBox(d, (d.FailedButStillRunning || d.Running) ? true : false);
                        }
                        else {
                            infoBox = tree.createInfoBox(d, (d.FailedButStillRunning || d.Running) ? true : false);
                        }
                        // Don't show the info box on a failed dependency node because we should only show the node ancestor's info box that failed
                        if (d.FailedDependency) {
                            tree.hideInfoBox(infoBox);
                        }
                        else {
                            tree.showInfoBox(infoBox);
                        }
                    }

                    // Update animations
                    if (d.Succeeded || d.Inactive) {
                        tree.hideRunningArcs(circle);
                        tree.animator.stopAnimation(d.BuildTypeId);
                        circle.style("opacity", 0.8)
                    }

                    else if (d.FailedButStillRunning || d.Running) {
                        
                        tree.drawRunningArcs(circle, d.FailedButStillRunning ? true : false);
                        var anim = tree.animator.getAnimation(d.BuildTypeId);   
                        if (anim == undefined || (anim.animationType !== "rotation"))  {
                            tree.animator.stopAnimation(d.BuildTypeId);
                            circle.style("opacity", 0.8)
                            tree.animator.rotate(circle, tree.settings.arcRotationSpeed, d.BuildTypeId);
                        }

                    }

                    else if (d.Failed) {
                        tree.hideRunningArcs(circle);
                        var anim = tree.animator.getAnimation(d.BuildTypeId);
                        if (anim == undefined || (anim.animationType !== "flashing")) {
                            tree.animator.stopAnimation(d.BuildTypeId);
                            tree.animator.flash(circle, tree.settings.flashSpeed, d.BuildTypeId);
                        }
                    }
            })

        }

    Tree.prototype.infoBoxExists =
        function(d) {
            var infoBox = this.container.selectAll("#infoBox_" + d.BuildTypeId);
            return infoBox[0].length > 0;
        }

    Tree.prototype.createInfoBox = 
        function(d, showProgressBar) {
            //this.container.selectAll("#infoBox_" + d.BuildTypeId).remove();
            var infoBox = this.container
                    .append("a")
                    .attr("href", "javascript: void(0)")
                    .style("text-decoration", "none")
                    .append("div")
                    .attr("href", d.LogUrl)
                    .attr("data-fancybox-type", "iframe")
                    .attr("id", "infoBox_" + d.BuildTypeId)
                    .attr("class", "infoBox_" + d.status)
                    .style("left", d.x + 20 + "px")
                    .style("top", d.y + 20 + "px")
                    .style("opacity", 0.0);
                    if (d.LogUrl) {
                        $("#infoBox_" + d.BuildTypeId).fancybox({
                                        fitToView: true,
                                        width: '85%',
                                        height: '85%',
                                        autoSize: false,
                                        closeClick: false,
                                        openEffect: 'fade',
                                        closeEffect: 'fade',
                                        openMethod: 'zoomIn',
                                        closeMethod: 'zoomOut',
                                        title: d.Name

                        });
                    }

            this.setInfoContents(infoBox, d, showProgressBar);

            return infoBox;

        }

    Tree.prototype.updateInfoBox = 
        function(d, showProgressBar) {
            var infoBox = this.container.selectAll("#infoBox_" + d.BuildTypeId);
            infoBox.selectAll("div").remove();

            infoBox
                .attr("id", "infoBox_" + d.BuildTypeId)
                .attr("class", "infoBox_" + d.status)
                .attr("href", d.LogUrl)

            this.setInfoContents(infoBox, d, showProgressBar);

            return infoBox;
        }

    Tree.prototype.setInfoContents = 
        function(infoBox, d, showProgressBar) {
            infoBox.append("div")
                .text(d.StatusText);


            if (showProgressBar) {
                infoBox.append("div")
                    .attr("class", "info-spacer")
                infoBox.append("div")
                    .attr("class", "progressbar-container")
                    .append("div")
                    .attr("class", "progressbar")
                    .style("width", d.PercentageCompleted + "%");
            }
        }

    Tree.prototype.showInfoBox = 
        function(infoBox, callback) {
            this.animator.fadeIn(infoBox, 200, callback);
        }

    Tree.prototype.getInfoBox = 
        function(d) {
            return this.container.selectAll("#infoBox_" + d.BuildTypeId);
        }

    Tree.prototype.hideInfoBox = 
        function(infoBox, callback) {
            this.animator.fadeOut(infoBox, 200, callback);
        }

    Tree.prototype.drawRunningArcs = 
        function(nodeElement, failed) {
            var tree = this;
            failed == null ? failed = false : failed;
            if (failed) {
                // If was running previously, remove the existing arcs
                nodeElement.selectAll(".arc").remove();

                nodeElement
                    .append("path")
                    .attr("d", this.runningArc1)
                    .attr("class", "arc arcRunningButFailed");

                nodeElement
                    .append("path")
                    .attr("d", this.runningArc2)
                    .attr("class", "arc arcRunningButFailed");

            }
            else if(!failed) {
                // If was running but failed previously, remove the existing arcs
                nodeElement.selectAll(".arc").remove();

                nodeElement
                    .append("path")
                    .attr("d", this.runningArc1)
                    .attr("class", "arc arcRunning");

                nodeElement
                    .append("path")
                    .attr("d", this.runningArc2)
                    .attr("class", "arc arcRunning");
            }
            
        }

    Tree.prototype.hideRunningArcs = 
        function(nodeElement) {
            //console.log("hiding arcs")
            nodeElement.selectAll(".arc").remove();
        }

    Tree.prototype.failedRunningArcsDrawn =
        function(nodeElement) {
            var existingRunningButFailed = nodeElement.selectAll(".arcRunningButFailed");
            return existingRunningButFailed[0].length != 0;
        }

    Tree.prototype.runningArcsDrawn =
        function(nodeElement) {
            var existingRunning = nodeElement.selectAll(".arcRunning");
            return existingRunning[0].length != 0;
        }


    // Animator it used by the Tree class to get and set animations on svg elements in the graphical tree
    function Animator() {
        this.runningAnimations = {}
    }

    Animator.prototype.rotate = 
        function(element, rotationSpeed, key) {
            function rotation(d, i, a) {
                return d3.interpolateString("rotation(0)", "rotate(360)");
            }

            function rotateFunc() {
                element.transition()
                    .duration(rotationSpeed)
                    .ease("linear")
                    .attrTween("transform", rotation)
            }

            rotateFunc();
            var id = setInterval(rotateFunc, rotationSpeed);
            this.runningAnimations[key] = {animationType: "rotation", setIntervalId: id};
        }

    Animator.prototype.fadeIn = 
        function(element, duration, callback) {
            //if (element != undefined) {
                element.transition()
                    .duration(duration)
                    .ease("linear")
                    .style("opacity", 0.8)
                    .each("end", callback);
                //}
        }

    Animator.prototype.fadeOut = 
        function(element, duration, callback) {
            //if (element != undefined) {
                element.transition()
                    .duration(duration)
                    .ease("linear")
                    .style("opacity", 0.0)
                    .each("end", callback);
            //}
        }

    Animator.prototype.flash =
        function(element, fadeSpeed, key) {
            var fadeIn = true;
            function flashFunc(d, i, a) {
                element.transition()
                    .duration(fadeSpeed)
                    .ease("linear").style("opacity", fadeIn ? 0.8 : 0.2)
                fadeIn = !fadeIn;
            }
            flashFunc();
            var id = setInterval(flashFunc, fadeSpeed);
            this.runningAnimations[key] = {animationType: "flashing", setIntervalId: id}
        }

    Animator.prototype.animationIsRunning = 
        function(key) {
            return this.runningAnimations[key] != undefined;
        }

    Animator.prototype.getAnimation =
        function(key) {
            if (this.runningAnimations[key] != undefined) {
                return this.runningAnimations[key];
            }
            else return undefined;
        }

    Animator.prototype.stopAnimation = 
        function(key) {
            if (this.runningAnimations[key] != undefined) {
                var id = this.runningAnimations[key].setIntervalId;
                clearInterval(id);
                delete this.runningAnimations[key];
            }
        }

}
