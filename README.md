cigraph.js
=======

Graph visualization for complex continuous integration pipelines

cigraph.js provides a 'bird's eye view' of a continuous integration (CI) pipeline.  In complex build environments, developers are unaware of how the build environment is setup and what to look for when CI fails at any stage.  Though it is not the developer's job to understand thoroughly how CI operates, developers should know immediately when and where CI fails.  Consequently, rapid feedback and fixes are facilitated.  To this end, cigraph.js provides a graphic tree view of a CI environment and generates visual cues when any stage of CI is running, failed or succeeded.

![Picture of cigraph.js in action](https://raw.github.com/fulcircle/cigraph.js/master/images/example_image.PNG)

Requirements:
--------------
* d3.js
* jQuery
* fancybox (if LogUrl property is defined for CI steps, see below)

How to call it:
---------------
```
var graph = new CiGraph(nodeData,
                        1,
                        {
                          width: $(window).width(),
                          height: $(window).height(),
                        }
graph.init();

/* After some time */

graph.update(updatedNodeData);
```

Please see the index.html in the 'example' directory to see how nodeData must be provided.  It is JSON formatted data that specifies information about the steps in the CI pipeline.  Each node represents one step in the CI pipeline.  The second argument specifies the 'root' node's ID in the nodeData representing the CI pipeline (the first step that will run when a CI run starts).

Obviously, we want to update the graph at regular intervals, so we call graph.update(updatedNodeData) with updated data about the state of CI.

You can also specify a 'LogUrl' property for each in the nodeData JSON.  If a node has LogUrl specified, and the node is clicked on in the graph, a fancybox window will pop-up, navigated to the url specified in LogUrl for that node.  You can also see this in action in the example.

![Picture of LogUrl popup](https://raw.github.com/fulcircle/cigraph.js/master/images/example_image2.PNG)



