async function init() {
  // 获取GPU设备的访问权限
  if (!navigator.gpu) {
    throw Error("WebGPU not supported.");
  }
  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw Error("Could'nt request WebGPU adapter.");
  }
  const device = await adapter.requestDevice();

  // 创建 shader
  async function loadShader(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const shaderCode = await response.text();
      return shaderCode;
    } catch (error) {
      console.error("Failed to load shader:", error);
    }
  }

  // 调用函数加载你的shader文件
  const shaders = await loadShader("shader.wgsl");
  const shaderModule = device.createShaderModule({ code: shaders });

  // 获取绘制区域
  const canvas = document.querySelector("#gpuCanvas");
  const context = canvas.getContext("webgpu");
  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });

  // 定义绘制的三角形，将三角形写入GPU渲染队列
  // X Y Z W R G B A
  // prettier-ignore
  const vertices = new Float32Array([
     1.0,  1.0, 0, 1, 1, 0, 0, 1,
    -1.0,  1.0, 0, 1, 1, 1, 0, 1,
    -1.0, -1.0, 0, 1, 0, 1, 1, 1,
     1.0,  1.0, 0, 1, 1, 0, 0, 1,
    -1.0, -1.0, 0, 1, 0, 1, 1, 1,
     1.0, -1.0, 0, 1, 1, 0, 1, 1,
  ]);
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

  // 定义渲染管线
  const vertexBuffers = [
    {
      attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x4" },
        { shaderLocation: 1, offset: 16, format: "float32x4" },
      ],
      arrayStride: 32,
      stepMode: "vertex",
    },
  ];
  const pipelineDescriptor = {
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: "auto",
  };
  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

  // 启动渲染管线
  /// 创建指令编码器
  const commandEncoder = device.createCommandEncoder();
  const renderPassDescriptor = {
    colorAttachments: [
      {
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      },
    ],
  };
  /// 创建通道编码器
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  /// 运行指令
  passEncoder.setPipeline(renderPipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(6);
  /// 完成指令列表后，将其封装至指令缓冲区
  passEncoder.end();
  /// 通过逻辑设备的指令列队提交指令到缓冲区
  device.queue.submit([commandEncoder.finish()]);
}

init();
