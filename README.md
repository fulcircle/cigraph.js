cigraph
=======

Graph visualization for complex continuous integration pipelines

cigraph.js provides a 'bird's eye view' of a continuous integration (CI) pipeline.  In complex build environments, developers are unaware of how the build environment is setup and what to look for when CI fails at any stage.  Though it is not the developer's job to understand thoroughly how CI operates, developers should know immediately when and where CI fails.  Consequently, rapid feedback and fixes are facilitated.  To this end, cigraph.js provides a graphic tree view of a CI environment and generates visual cues when any stage of CI is running, failed or succeeded.

Requirements:

d3.js
jQuery
fancybox (if LogUrl property is defined for CI steps, see below)

How to call it:

var graph = new CiGraph(nodeData,
                        1,
                        {
                          width: $(window).width(),
                          height: $(window).height(),
                        }
                        
Please see the index.html in the 'examle' directory to see how nodeData must be provided.  It is JSON formatted data that specifies information about the steps in the CI pipeline.  The second argument specifies the root node ID in the nodeData representing the CI pipeline (the first step that will run when a CI cycle starts).

